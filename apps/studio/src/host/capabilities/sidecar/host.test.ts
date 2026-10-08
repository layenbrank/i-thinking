import net from 'node:net'
import { createInterface } from 'node:readline'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Logger } from '@/host/framework/logger'
import { CorexHost, findStatus, parseCatalog } from './index'

/** 复用路径没有 child，测试要点是它别被当成「启动失败」 */
const { ENDPOINT } = vi.hoisted(function () {
  const name = `corex-test-${process.pid}`
  const endpoint = process.platform === 'win32' ? `\\\\.\\pipe\\${name}` : `/tmp/${name}.sock`
  return { ENDPOINT: endpoint }
})

vi.mock('./install', function () {
  return {
    findCorexInstall: async function () {
      return {
        daemon: 'corex-daemon',
        dataDir: '/tmp/corex-test',
        database: '/tmp/corex-test/corex.db',
        endpoint: ENDPOINT,
        version: '11.0.0',
        isBundled: false,
        tokenFile: null
      }
    },
    resolveAuthToken: function () {
      return 'test-token'
    }
  }
})

const log = {
  debug: function () {},
  info: function () {},
  warn: function () {},
  error: function () {},
  child: function () {
    return log
  }
} as unknown as Logger

let server: net.Server | null = null
let disconnectOnDirectives = false
/** 假 daemon 收到的原始请求帧：用来钉住「我们发出去的字段名」 */
const frames: Record<string, unknown>[] = []

/** 假 daemon：认 ping，list_actions 回一条动作，shutdown 用契约里的终帧 `bye` 道别 */
function serve(socket: net.Socket): void {
  const reader = createInterface({ input: socket })
  reader.on('line', function (raw) {
    const request = JSON.parse(raw) as { id: number; type: string }
    frames.push(request as Record<string, unknown>)
    if (disconnectOnDirectives && request.type === 'directives') {
      socket.destroy()
      return
    }
    const response =
      request.type === 'ping'
        ? { type: 'pong', id: request.id }
        : request.type === 'shutdown'
          ? { type: 'bye', id: request.id }
          : { type: 'ok', id: request.id, data: [{ id: 'file.copy' }] }
    socket.write(`${JSON.stringify(response)}\n`)
  })
}

async function listen(): Promise<void> {
  server = net.createServer(serve)
  await new Promise<void>(function (resolve) {
    server?.listen(ENDPOINT, resolve)
  })
}

afterEach(async function () {
  if (server) {
    await new Promise<void>(function (resolve) {
      server?.close(function () {
        resolve()
      })
    })
  }
  server = null
  disconnectOnDirectives = false
  frames.length = 0
})

describe('CorexHost.start', function () {
  it('reuses a daemon that is already running', async function () {
    await listen()
    const host = new CorexHost(log)
    await host.start()

    expect(host.isRunning()).toBe(true)
    expect(host.findVersion()).toBe('11.0.0')
    expect(host.findActions()).toEqual(['file.copy'])
    // 指令库路径要跟着 discovery 走，界面显示的就是真在用的那一份
    expect(findStatus(host).database).toBe('/tmp/corex-test/corex.db')
  })

  it('shares the startup promise with requests arriving during startup', async function () {
    await listen()
    const host = new CorexHost(log)

    await Promise.all([host.start(), host.fetchDirectives()])

    expect(host.isRunning()).toBe(true)
  })

  it('marks the host disconnected when a request loses its transport', async function () {
    await listen()
    const host = new CorexHost(log)
    await host.start()
    disconnectOnDirectives = true

    await expect(host.fetchDirectives()).rejects.toThrow()
    expect(host.isRunning()).toBe(false)
  })
})

describe('outbound frames', function () {
  /**
   * 钉住发出去的字段名。真源是 corex 的 `crates/ipc/src/protocol.rs`：字段名对不上时
   * serde 会把未知字段**静默忽略**（`overwrite: true` 变成不覆盖），比报错更难查。
   */
  function keysOf(type: string): string[] {
    const frame = frames.find(function (f) {
      return f.type === type
    })
    return frame ? Object.keys(frame).sort() : []
  }

  it('names every field the way the daemon declares it', async function () {
    await listen()
    const host = new CorexHost(log)
    await host.start()
    frames.length = 0

    await host.readDirective('a')
    await host.saveDirective({ name: 'a' } as never, 'b')
    await host.deleteDirective('a')
    await host.importDirectives({
      path: 'C:\\y',
      folder: 'f',
      is_overwrite: true,
      is_dry_run: true
    })
    await host.fetchDirectives()
    await host.runDirective('a', { x: 1 })
    await host.invokeAction('file.copy', { from: 'a', to: 'b' })

    expect(keysOf('directives')).toEqual(['auth_token', 'id', 'type'])
    expect(keysOf('read_directive')).toEqual(['auth_token', 'id', 'name', 'type'])
    expect(keysOf('save_directive')).toEqual([
      'auth_token',
      'definition',
      'id',
      'name',
      'original_name',
      'type'
    ])
    expect(keysOf('delete_directive')).toEqual(['auth_token', 'id', 'name', 'type'])
    expect(keysOf('import_directives')).toEqual([
      'auth_token',
      'folder',
      'id',
      'is_dry_run',
      'is_overwrite',
      'path',
      'type'
    ])
    expect(keysOf('run_directive')).toEqual(['auth_token', 'id', 'input', 'name', 'type'])
    expect(keysOf('invoke')).toEqual(['action', 'auth_token', 'id', 'params', 'type'])
  })
})

describe('CorexHost.stop', function () {
  it('takes the bye farewell for a normal shutdown reply', async function () {
    await listen()
    const warns: unknown[] = []
    const spied = {
      debug: function () {},
      info: function () {},
      warn: function (...args: unknown[]) {
        warns.push(args)
      },
      error: function (...args: unknown[]) {
        warns.push(args)
      },
      child: function () {
        return spied
      }
    } as unknown as Logger

    const host = new CorexHost(spied)
    await host.start()
    // 只有自己起的 daemon 才关，复用的那份只断开 —— 给个假 child 走完整路径
    const closed = {
      killed: false,
      once: function (_event: string, listener: () => void) {
        listener()
        return closed
      },
      kill: function () {}
    }
    ;(host as unknown as { child: unknown }).child = closed

    await host.stop()

    expect(warns).toEqual([])
  })
})

describe('parseCatalog', function () {
  it('keeps the fields the action library renders', function () {
    const actual = parseCatalog([
      {
        id: 'file.copy',
        name: '复制',
        description: '复制文件',
        bucket: 'data',
        params: [{ name: 'from', ty: 'path', required: true }],
        tags: ['fs'],
        permissions: ['filesystem'],
        input_schema: { type: 'object' }
      }
    ])
    expect(actual).toEqual([
      {
        id: 'file.copy',
        name: '复制',
        description: '复制文件',
        bucket: 'data',
        params: [{ name: 'from', ty: 'path', required: true }],
        tags: ['fs'],
        permissions: ['filesystem'],
        input_schema: { type: 'object' }
      }
    ])
  })

  it('accepts the { actions } wrapper', function () {
    expect(
      parseCatalog({ actions: [{ id: 'shell.run' }] }).map(function (action) {
        return action.id
      })
    ).toEqual(['shell.run'])
  })

  it('fills the missing fields and skips the rows without an id', function () {
    const actual = parseCatalog([{ name: 'no-id' }, null, 1, { id: 'ok' }])
    expect(actual).toEqual([
      {
        id: 'ok',
        name: 'ok',
        description: '',
        bucket: 'plugin',
        params: [],
        tags: [],
        permissions: [],
        input_schema: {}
      }
    ])
  })

  it('returns nothing for a shape it does not know', function () {
    expect(parseCatalog('nope')).toEqual([])
    expect(parseCatalog(null)).toEqual([])
  })
})
