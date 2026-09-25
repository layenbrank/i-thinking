import { spawn, type ChildProcess } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:net'

import { buildOpencodeEnv, findOpencodeBinary, findOpencodeRoot } from './paths'

/**
 * 内嵌 opencode server 的生命周期。
 *
 * studio 不用 SDK 的 `createOpencodeServer()`（它要求在 PATH 里能找到 `opencode`），
 * 而是自己 spawn sidecar 里那份二进制，于是端口、数据目录、鉴权口令都握在自己手里。
 *
 * 三个必须自己做的事：
 * 1. **探空闲端口**：`--port 0` 实测会落到固定 4096（不是随机空闲端口），多开或端口被占就崩，
 *    所以先用 `net` 探出来再传；
 * 2. **隔离数据目录**：opencode 默认写 `~/.local/share/opencode`，那可能是用户自己的会话库，
 *    直接连上去会因为库里有别的东西而启动失败；
 * 3. **配置随进程走**：provider / apiKey 走 `OPENCODE_CONFIG_CONTENT` 内联注入，
 *    不落盘（凭据不复制到磁盘）。代价是**改配置必须重启** server —— 实测配置既不热重载，
 *    `config.update` 也只改内存视图、不重新注册 provider。
 */

/** 启动等待上限：首次启动要装 opencode 自己的插件依赖，给足时间 */
const START_TIMEOUT_MS = 30_000
/** 关闭等待上限：超时就当它已经死了，不阻塞退出 */
const CLOSE_TIMEOUT_MS = 3_000
/** 保留多少行 stderr 用于诊断 */
const STDERR_TAIL_LINES = 40
/** 启动输出里的监听地址（v2 实测格式：`server listening on http://127.0.0.1:PORT`） */
const LISTEN_PATTERN = /server listening on (\S+)/

interface Log {
  info: (message: string) => void
  warn: (message: string, error?: unknown) => void
}

interface OpencodeServerHandle {
  url: string
  password: string
  /** 启动时用的配置签名；变了就得重启 */
  signature: string
}

function findFreePort(): Promise<number> {
  return new Promise(function (resolve, reject) {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, '127.0.0.1', function () {
      const address = probe.address()
      const port = typeof address === 'object' && address ? address.port : 0
      probe.close(function () {
        if (port > 0) resolve(port)
        else reject(new Error('无法分配空闲端口'))
      })
    })
  })
}

/** 拉起一个 `opencode serve`，等它自报监听地址 */
function startServer(
  config: Record<string, unknown>,
  log: Log
): Promise<{ handle: OpencodeServerHandle; child: ChildProcess }> {
  const binary = findOpencodeBinary()
  if (!binary) {
    return Promise.reject(
      new Error(
        '未找到 opencode 二进制，请先执行 `pnpm sidecar stage studio` 或设置 OPENCODE_BINARY'
      )
    )
  }

  const password = randomBytes(24).toString('hex')

  return findFreePort().then(function (port) {
    const child = spawn(binary, ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      env: {
        ...process.env,
        ...buildOpencodeEnv(findOpencodeRoot()),
        OPENCODE_CONFIG_CONTENT: JSON.stringify(config),
        OPENCODE_SERVER_PASSWORD: password
      },
      // 没有控制台窗口的打包应用里也不弹黑框
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    })

    return new Promise<{ handle: OpencodeServerHandle; child: ChildProcess }>(function (
      resolve,
      reject
    ) {
      let out = ''
      const tail: string[] = []
      let isSettled = false

      function collect(chunk: string) {
        out += chunk
        if (out.length > 64_000) out = out.slice(-32_000)
      }

      const timer = setTimeout(function () {
        if (isSettled) return
        isSettled = true
        child.kill()
        log.warn(`opencode server 启动超时；stderr:\n${tail.join('\n')}`)
        reject(new Error('opencode server 启动超时'))
      }, START_TIMEOUT_MS)

      child.stdout?.on('data', function (data: Buffer) {
        collect(data.toString('utf8'))
        const match = LISTEN_PATTERN.exec(out)
        if (!match || isSettled) return
        isSettled = true
        clearTimeout(timer)
        const url = match[1].replace(/\/+$/, '')
        log.info(`opencode server 已就绪: ${url}`)
        resolve({ handle: { url, password, signature: '' }, child })
      })

      child.stderr?.on('data', function (data: Buffer) {
        const text = data.toString('utf8').trimEnd()
        collect(text)
        tail.push(text)
        if (tail.length > STDERR_TAIL_LINES) tail.shift()
      })

      child.once('error', function (error) {
        if (isSettled) return
        isSettled = true
        clearTimeout(timer)
        reject(error)
      })

      child.once('exit', function (code) {
        if (isSettled) return
        isSettled = true
        clearTimeout(timer)
        log.warn(`opencode server 提前退出 (code=${String(code)})；stderr:\n${tail.join('\n')}`)
        reject(new Error(`opencode server 提前退出 (code=${String(code)})`))
      })
    })
  })
}

function stopChild(child: ChildProcess): Promise<void> {
  return new Promise(function (resolve) {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve()
      return
    }

    const timer = setTimeout(function () {
      // 它自己的退出流程卡住了：强杀进程（单进程，无子进程需要连带处理）
      child.kill('SIGKILL')
      resolve()
    }, CLOSE_TIMEOUT_MS)

    child.once('exit', function () {
      clearTimeout(timer)
      resolve()
    })
    child.kill()
  })
}

/**
 * server 句柄的持有者：按配置签名做「复用 / 重启」。
 *
 * 调用方保证并发安全（engine 会把 `ensure` 串成一条链）——这里只负责状态。
 */
class OpencodeServerManager {
  private readonly log: Log
  /**
   * 进程**意外**退出时的回调（崩溃 / 被外部杀掉）。
   *
   * 这里只负责清句柄让下次 `ensure` 重新拉起；在途运行怎么办只有引擎知道，
   * 所以由它来决定（见 `OpencodeEngine.handleServerExit`）。
   */
  private readonly onExit: (() => void) | undefined
  private current: { handle: OpencodeServerHandle; child: ChildProcess } | null = null

  constructor(log: Log, onExit?: () => void) {
    this.log = log
    this.onExit = onExit
  }

  /**
   * 拿到一个跑着 `signature` 这份配置的 server。
   *
   * 签名一致就复用；不一致就把旧的关掉重起 —— provider / 凭据变了没有别的路子
   * （见文件头注释）。
   *
   * `deferIfRunning` 让调用方在**有运行在途**时表达「宁可这次用旧配置，也别重启」：
   * 重启会把正在跑的那次连人带马杀掉，而配置变化下一轮（空闲时）自然就应用上了。
   */
  async ensure(
    signature: string,
    config: Record<string, unknown>,
    options: { deferIfRunning?: boolean } = {}
  ): Promise<OpencodeServerHandle> {
    if (this.current && this.current.handle.signature === signature) return this.current.handle

    if (this.current && options.deferIfRunning) {
      this.log.info('opencode 配置已变化，但仍有运行在途，本次沿用现有 server')
      return this.current.handle
    }

    if (this.current) {
      this.log.info('opencode 配置已变化，重启 server')
      const previous = this.current
      this.current = null
      await stopChild(previous.child)
    }

    const started = await startServer(config, this.log)
    const handle: OpencodeServerHandle = { ...started.handle, signature }
    this.current = { handle, child: started.child }
    // 进程意外死掉（崩溃 / 被外部杀掉）时清掉句柄，下一次 ensure 才会重新拉起；
    // 主动重启与 dispose 会先把 current 置空，所以走到 onExit 的一定是意外
    const manager = this
    started.child.once('exit', function () {
      if (manager.current?.child !== started.child) return
      manager.current = null
      manager.onExit?.()
    })
    return handle
  }

  async dispose(): Promise<void> {
    const current = this.current
    this.current = null
    if (current) await stopChild(current.child)
  }
}

export { findFreePort, OpencodeServerManager, startServer, stopChild }
export type { Log, OpencodeServerHandle }
