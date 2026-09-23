import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { createInterface } from 'node:readline'

import type { CHANNELS } from '../../../shared/ipc/channels'
import type { Out } from '../../../shared/ipc/specs'
import type { DirectiveContent } from '../../../shared/ipc/specs/sidecar'
import type { Context } from '../../framework/context'
import type { Logger } from '../../framework/logger'
import type { Plugin } from '../../framework/module'
import type { DirectiveDocument, DirectiveEntry } from './directive'
import { parseDirectiveDocument, parseDirectiveEntries } from './directive'
import { findCorexInstall, hasPandoc, resolveAuthToken, type CorexInstall } from './install'

const READY_TIMEOUT_MS = 15_000
/** 静止多久算死：收到任何一帧（含 daemon 每两秒一帧的心跳）都重新计时 */
const IDLE_TIMEOUT_MS = 60_000
/** ping 是有事没事都发的探针，不能按业务请求的时限等 */
const PING_TIMEOUT_MS = 2_000
const STOP_TIMEOUT_MS = 3_000
const PING_INTERVAL_MS = 200

/** 显式指定 daemon 数据目录（corex `data_dir()` 第一优先）：必须指到发现出来的那棵树 */
const COREX_DATA_DIR_ENV = 'COREX_DATA_DIR'

/** corex `list_actions` 返回的单个动作（宽松形状，渲染侧由 zod 校验） */
interface CorexActionParam {
  name: string
  ty: string
  required: boolean
  description?: string
  default?: unknown
}

interface CorexAction {
  id: string
  name: string
  description: string
  bucket: string
  params: CorexActionParam[]
  tags: string[]
  permissions: string[]
  input_schema: Record<string, unknown>
}

/** corex stream 的步骤帧（与 `run --json-events` / corex-client 同一套词汇） */
interface CorexStepProgress {
  kind: 'step_start' | 'step_progress' | 'step_output' | 'step_end'
  step: string
  action: string
  seq?: number
  done?: number
  total?: number | null
  unit?: 'bytes' | 'items'
  /** `step_output` 才有：子进程的哪一路 */
  stream?: 'stdout' | 'stderr'
  /** `step_output` 才有：一段增量原文，可能半行断开 */
  text?: string
  took_ms?: number
  ok?: boolean
}

/**
 * 心跳帧：唯一**不属于任何步骤**的帧。
 *
 * daemon 从收到请求起每两秒推一帧（排队期间也推），所以「多久没有帧」才等于「对面是不是死了」。
 * 没有它时，「在队列里等几分钟」与「卡死」在客户端看来完全一样，而排队会把请求时限撞穿——
 * 超时被报成失败，请求其实还在队列里、之后照样执行。
 */
interface CorexHeartbeat {
  kind: 'heartbeat'
  /** `true` = 还在队列里等执行名额（corex 的 `[daemon] max_jobs`），`false` = 已经在跑 */
  is_queued: boolean
  /** 从请求到发出这帧等了多久：排队与执行都算在内 */
  waited_ms: number
}

type CorexProgress = CorexStepProgress | CorexHeartbeat

interface RpcErrorBody {
  code?: number
  message?: string
}

interface RpcResponse {
  type: string
  id?: number
  data?: unknown
  error?: RpcErrorBody
  progress?: CorexProgress
}

/** 连 corex-daemon 的那一端：NDJSON over named pipe / unix socket。 */
class CorexHost {
  private readonly logger: Logger
  private install: CorexInstall | null = null
  private child: ChildProcessWithoutNullStreams | null = null
  private isReady = false
  private isBundledInstall = false
  private version = ''
  private dataDir = ''
  private actions: string[] = []
  private catalog: CorexAction[] = []
  private authToken = ''
  private requestId = 1
  private endpoint = ''
  private startPromise: Promise<void> | null = null

  constructor(logger: Logger) {
    this.logger = logger.child('corex')
  }

  findActions(): readonly string[] {
    return this.actions
  }

  findCatalog(): readonly CorexAction[] {
    return this.catalog
  }

  findVersion(): string {
    return this.version
  }

  findDataDir(): string {
    return this.dataDir
  }

  isBundled(): boolean {
    return this.isBundledInstall
  }

  hasInstall(): boolean {
    return this.install !== null
  }

  hasAction(actionId: string): boolean {
    return this.actions.includes(actionId)
  }

  isRunning(): boolean {
    return this.isReady
  }

  async start(): Promise<void> {
    if (this.isReady) {
      return
    }

    if (this.startPromise) {
      return this.startPromise
    }

    const promise = this.startInternal()
    this.startPromise = promise
    try {
      await promise
    } finally {
      if (this.startPromise === promise) {
        this.startPromise = null
      }
    }
  }

  private async startInternal(): Promise<void> {
    const found = await findCorexInstall()
    // `paths` 报 token_file: null 有两种情况：token 来自 env / 配置，或者还没有 daemon 写下过它。
    // 自起的 daemon 在没 env / 配置 token 时会写 <data>/token，所以留这条退路 —— 读不到只会是空串。
    this.install = found.tokenFile
      ? found
      : { ...found, tokenFile: path.join(found.dataDir, 'token') }
    this.endpoint = this.install.endpoint
    this.dataDir = this.install.dataDir
    this.isBundledInstall = this.install.isBundled
    this.version = this.install.version
    this.authToken = resolveAuthToken(this.install)

    // 用户机器上可能已经有一个 corex 在跑：能用就复用它，别去抢 corex.lock（抢不到只会白等）。
    const probe = await this.ping()
    if (probe === 'ok') {
      this.logger.info('复用已在运行的 corex', { endpoint: this.endpoint, dataDir: this.dataDir })
    } else {
      if (probe === 'unauthorized') {
        this.logger.warn('端点上已有 corex 但不认这个 token，自起可能抢不到锁', {
          endpoint: this.endpoint
        })
      }
      this.spawnDaemon(this.install)
    }

    await this.waitUntilReady(probe === 'unauthorized')
    this.isReady = true
    await this.refreshActions()
    this.logger.info('corex ready', {
      version: this.version,
      endpoint: this.endpoint,
      dataDir: this.dataDir,
      isBundled: this.isBundledInstall,
      actions: this.actions.length
    })
  }

  /** 执行单个 Action（如 capture.screenshot）。给 onProgress 则走 stream。 */
  async invokeAction(
    action: string,
    params: Record<string, unknown> = {},
    onProgress?: (progress: CorexStepProgress) => void
  ): Promise<unknown> {
    return this.call(
      'invoke',
      { action, params, ...(onProgress ? { stream: true } : {}) },
      onProgress
    )
  }

  /** 执行指令（corex `run_directive`）。给 onProgress 则走 stream。 */
  async runDirective(
    name: string,
    input: Record<string, unknown> = {},
    onProgress?: (progress: CorexStepProgress) => void
  ): Promise<unknown> {
    return this.call(
      'run_directive',
      { name, input, ...(onProgress ? { stream: true } : {}) },
      onProgress
    )
  }

  /** 指令目录里的指令（corex `list_directives`）；dir 是数据目录下的子目录。 */
  async listDirectives(dir?: string): Promise<DirectiveEntry[]> {
    return parseDirectiveEntries(await this.call('list_directives', dir ? { dir } : {}))
  }

  async readDirective(name: string): Promise<DirectiveDocument> {
    return parseDirectiveDocument(await this.call('read_directive', { name }))
  }

  /** 保存指令：模型交给 corex 校验并落盘，返回它写下的那一份（含原文）。 */
  async saveDirective(definition: DirectiveContent): Promise<DirectiveDocument> {
    return parseDirectiveDocument(
      await this.call('save_directive', { name: definition.name, definition })
    )
  }

  async stop(): Promise<void> {
    // 复用的 daemon 不是我们起的，只断开，没资格关它
    if (!this.child) {
      this.markDisconnected('stop: 复用的 daemon 保持运行')
      return
    }

    try {
      if (this.isReady) {
        await Promise.race([this.requestShutdown(), sleep(STOP_TIMEOUT_MS)])
      }
    } catch (error) {
      this.logger.warn('corex shutdown 请求失败', error)
    }

    await this.killChild()
  }

  /**
   * 叫 daemon 优雅退出。**不能**走 `call()`：`shutdown` 的终帧是 `bye`（契约里「道别」
   * 就是收到并准备退出），而 `parseOkData` 只认 `ok` / `pong`，会把这一帧报成「不认识的
   * 响应类型」——每次停止都记一条假失败。
   */
  private requestShutdown(): Promise<RpcResponse> {
    return this.exchange({ type: 'shutdown', id: this.requestId++, auth_token: this.authToken })
  }

  private async call(
    type: string,
    fields: Record<string, unknown> = {},
    onProgress?: (progress: CorexStepProgress) => void
  ): Promise<unknown> {
    if (!this.isReady) {
      await this.start()
    }
    if (!this.isReady) {
      throw new Error('corex 未就绪')
    }
    const response = await this.exchange(
      { type, id: this.requestId++, auth_token: this.authToken, ...fields },
      onProgress
    )
    return parseOkData(response)
  }

  /**
   * 探端点上是不是已经有个能用的 daemon。三种结果要分开：
   * 「认我们的 token」可复用；「有人在但不认」说明它的 token 我们读不到（多半写在 corex 配置里），
   * 自起一个也抢不到 corex.lock，只能如实告诉用户；「没人应答」才是该自起。
   */
  private async ping(): Promise<'ok' | 'unauthorized' | 'absent'> {
    try {
      const response = await this.exchange(
        { type: 'ping', id: this.requestId++, auth_token: this.authToken },
        undefined,
        PING_TIMEOUT_MS
      )
      return response.type === 'pong' || response.type === 'ok' ? 'ok' : 'unauthorized'
    } catch (error) {
      console.warn('[corex] ping 无人应答，按未启动处理', error)
      return 'absent'
    }
  }

  private spawnDaemon(install: CorexInstall): void {
    const child = spawn(install.daemon, ['--socket', install.endpoint], {
      stdio: 'pipe',
      shell: false,
      windowsHide: true,
      cwd: path.dirname(install.daemon),
      env: {
        ...process.env,
        // 数据目录必须两边一致：不显式指定的话 daemon 会按自己 exe 的位置猜，
        // 读出来的指令就不是编辑器里看到的那一份
        [COREX_DATA_DIR_ENV]: install.dataDir
      }
    })
    this.child = child

    // 事件回调必须是 function（禁用箭头），而它们要用的 `this` 是类实例 —— 先存一份别名，
    // 通过 `host.x` 访问能保住调用者绑定，行为与箭头一样。
    const host = this

    child.on('error', function (err) {
      host.logger.error('corex-daemon process error', err)
      host.markDisconnected(String(err))
    })

    child.on('exit', function (code, signal) {
      // 只有还是当前这个 child 才作数：stop() 之后旧 child 的 exit 不该动新会话的状态
      if (host.child !== child) {
        return
      }
      host.logger.warn('corex-daemon exited', { code, signal })
      host.markDisconnected(`corex-daemon exited (code=${code}, signal=${signal})`)
    })

    child.stderr.on('data', function (chunk: Buffer) {
      const text = chunk.toString('utf8').trim()
      if (text) {
        host.logger.warn('corex-daemon stderr', { text })
      }
    })
  }

  private async waitUntilReady(hasOccupant: boolean): Promise<void> {
    // 复用的 daemon 不是我们起的，没有 child —— 只有自起的那个才要盯住别半路死掉
    const spawned = this.child
    const deadline = Date.now() + READY_TIMEOUT_MS
    while (Date.now() < deadline) {
      if (spawned && spawned.exitCode !== null) {
        throw new Error('corex-daemon 未就绪就退出了')
      }
      // 自起的 daemon 是启动之后才把 token 写下来的，每轮都重读
      const token = this.install ? resolveAuthToken(this.install) : ''
      if (token) {
        this.authToken = token
      }
      if ((await this.ping()) === 'ok') {
        return
      }
      await sleep(PING_INTERVAL_MS)
    }

    const hint = hasOccupant
      ? '：端点上已有一个 corex 在跑，但它的 token 不在我们能读的地方（多半写在 corex 配置里），自起的那个抢不到 corex.lock。设置 COREX_TOKEN 后重启 Studio。'
      : ''
    throw new Error(`corex-daemon 启动超时（${this.endpoint}，数据目录 ${this.dataDir}）${hint}`)
  }

  private async refreshActions(): Promise<void> {
    try {
      const response = await this.exchange({
        type: 'list_actions',
        id: this.requestId++,
        auth_token: this.authToken
      })
      this.catalog = parseCatalog(parseOkData(response))
      this.actions = this.catalog.map(function (action) {
        return action.id
      })
    } catch (error) {
      this.logger.warn('list_actions failed', error)
      this.catalog = []
      this.actions = []
    }
  }

  private exchange(
    payload: Record<string, unknown>,
    onProgress?: (progress: CorexStepProgress) => void,
    timeoutMs = IDLE_TIMEOUT_MS
  ): Promise<RpcResponse> {
    const line = `${JSON.stringify(payload)}\n`
    const endpoint = this.endpoint
    const host = this

    return new Promise(function (resolve, reject) {
      let isSettled = false
      let timer: NodeJS.Timeout | undefined
      const socket = new net.Socket()

      function finish(error: Error | null, value?: RpcResponse) {
        if (isSettled) {
          return
        }
        isSettled = true
        clearTimeout(timer)
        socket.removeAllListeners()
        if (!socket.destroyed) {
          socket.destroy()
        }
        if (error) {
          host.markDisconnected(`${String(payload.type)}: ${error.message}`)
          reject(error)
          return
        }
        resolve(value as RpcResponse)
      }

      /**
       * 静默超时才判死：每收到一帧就重新计时。
       * daemon 每两秒推一帧心跳（排队期间也推），所以「久到没有帧」才等于对面死了；
       * 若按总时长计时，排队与长任务都会被误报成失败，而 daemon 其实还在跑。
       */
      function rearm() {
        clearTimeout(timer)
        timer = setTimeout(function () {
          finish(new Error(`corex IPC timeout: ${String(payload.type)}（${timeoutMs}ms 无帧）`))
        }, timeoutMs)
      }

      rearm()

      // 必须在 connect 前挂上，且用 on（非 once）：ENOENT 后 destroy 可能再发 error
      socket.on('error', function (err) {
        finish(err instanceof Error ? err : new Error(String(err)))
      })

      socket.connect({ path: endpoint }, function () {
        const reader = createInterface({ input: socket })
        reader.on('error', function (err) {
          finish(err instanceof Error ? err : new Error(String(err)))
        })
        reader.on('close', function () {
          if (!isSettled) {
            finish(new Error(`corex IPC connection closed: ${String(payload.type)}`))
          }
        })
        reader.on('line', function (raw) {
          let message: RpcResponse
          try {
            message = JSON.parse(raw) as RpcResponse
          } catch (error) {
            console.warn('[corex] RPC 响应不是合法 JSON', error)
            finish(error instanceof Error ? error : new Error(String(error)))
            return
          }
          // 收到帧就重新计时：这一帧之后如果对面死了，判死还是准的
          rearm()
          // stream：event 帧回调进度、继续读；终帧才结束
          if (message.type === 'event') {
            const progress = message.progress
            // 心跳帧只是保活，它不属于任何步骤；推给渲染侧只会让运行日志平白多出几百条空帧
            if (progress && progress.kind !== 'heartbeat') {
              onProgress?.(progress)
            }
            return
          }
          finish(null, message)
          reader.close()
        })
        socket.write(line)
      })
    })
  }

  private markDisconnected(reason: string): void {
    this.isReady = false
    this.actions = []
    this.catalog = []
    this.logger.info('corex 断开', { reason })
  }

  private async killChild(): Promise<void> {
    const child = this.child
    this.child = null
    this.markDisconnected('stop')

    if (!child || child.killed) {
      return
    }

    await new Promise<void>(function (resolve) {
      const timer = setTimeout(function () {
        try {
          child.kill()
        } catch (error) {
          console.warn('[corex] 超时后强杀 daemon 失败', error)
        }
        resolve()
      }, STOP_TIMEOUT_MS)

      child.once('exit', function () {
        clearTimeout(timer)
        resolve()
      })

      try {
        child.kill()
      } catch (error) {
        console.warn('[corex] 停止 daemon 失败', error)
        clearTimeout(timer)
        resolve()
      }
    })
  }
}

function parseOkData(response: RpcResponse): unknown {
  if (response.type === 'ok') {
    return response.data
  }
  if (response.type === 'pong') {
    return { pong: true }
  }
  if (response.type === 'error') {
    const code = response.error?.code ?? 'unknown'
    const message = response.error?.message ?? 'corex invoke failed'
    throw new Error(`[${code}] ${message}`)
  }
  throw new Error(`unexpected corex response type: ${response.type}`)
}

/** `list_actions` 的完整目录（宽松解析，渲染侧由 zod 校验）。 */
function parseCatalog(data: unknown): CorexAction[] {
  const items = findActionItems(data)
  const actions: CorexAction[] = []
  for (const item of items) {
    if (!item || typeof item !== 'object') {
      continue
    }
    const row = item as Record<string, unknown>
    if (typeof row.id !== 'string' || row.id.length === 0) {
      continue
    }
    actions.push({
      id: row.id,
      name: typeof row.name === 'string' ? row.name : row.id,
      description: typeof row.description === 'string' ? row.description : '',
      bucket: typeof row.bucket === 'string' ? row.bucket : 'plugin',
      params: Array.isArray(row.params) ? (row.params as CorexActionParam[]) : [],
      tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
      permissions: Array.isArray(row.permissions) ? (row.permissions as string[]) : [],
      input_schema:
        row.input_schema && typeof row.input_schema === 'object'
          ? (row.input_schema as Record<string, unknown>)
          : {}
    })
  }
  return actions
}

function findActionItems(data: unknown): unknown[] {
  if (Array.isArray(data)) {
    return data
  }
  if (data && typeof data === 'object' && Array.isArray((data as { actions?: unknown }).actions)) {
    return (data as { actions: unknown[] }).actions
  }
  return []
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

type FindStatusR = Out<typeof CHANNELS.SIDECAR.READ>

function findStatus(corex: CorexHost): FindStatusR {
  return {
    isReady: corex.isRunning(),
    version: corex.findVersion(),
    actions: [...corex.findActions()],
    hasCorex: corex.hasInstall(),
    hasPandoc: hasPandoc(),
    dataDir: corex.findDataDir(),
    isBundled: corex.isBundled()
  }
}

function buildPlugin(): Plugin {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    register(ctx: Context) {
      corex = ctx.corex

      const log = ctx.logger.child('sidecar')
      void ctx.corex
        .start()
        .then(function () {
          log.info('registered', {
            corexActionCount: ctx.corex.findActions().length,
            hasScreenshot: ctx.corex.hasAction('capture.screenshot'),
            version: ctx.corex.findVersion(),
            dataDir: ctx.corex.findDataDir()
          })
        })
        .catch(function (error) {
          log.error('corex start failed (degraded)', error)
        })
    },
    async dispose() {
      if (!corex) {
        return
      }
      await corex.stop()
    }
  }
}

export { CorexHost, buildPlugin, findStatus, parseCatalog }
export type { CorexAction, CorexActionParam, CorexProgress, CorexStepProgress }
