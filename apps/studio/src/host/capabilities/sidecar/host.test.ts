import net from 'node:net'
import { createInterface } from 'node:readline'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Logger } from '../../framework/logger'
import { CorexHost, parseCatalog } from './index'

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
        endpoint: ENDPOINT,
        version: '11.0.0',
        isBundled: false,
        tokenFile: null
      }
    },
    hasPandoc: function () {
      return false
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
let disconnectOnList = false

/** 假 daemon：认 ping，list_actions 回一条动作，shutdown 用契约里的终帧 `bye` 道别 */
function serve(socket: net.Socket): void {
  const reader = createInterface({ input: socket })
  reader.on('line', function (raw) {
    const request = JSON.parse(raw) as { id: number; type: string }
    if (disconnectOnList && request.type === 'list_directives') {
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
  disconnectOnList = false
})

describe('CorexHost.start', function () {
  it('reuses a daemon that is already running', async function () {
    await listen()
    const host = new CorexHost(log)
    await host.start()

    expect(host.isRunning()).toBe(true)
    expect(host.findVersion()).toBe('11.0.0')
    expect(host.findActions()).toEqual(['file.copy'])
  })

  it('shares the startup promise with requests arriving during startup', async function () {
    await listen()
    const host = new CorexHost(log)

    await Promise.all([host.start(), host.listDirectives()])

    expect(host.isRunning()).toBe(true)
  })

  it('marks the host disconnected when a request loses its transport', async function () {
    await listen()
    const host = new CorexHost(log)
    await host.start()
    disconnectOnList = true

    await expect(host.listDirectives()).rejects.toThrow()
    expect(host.isRunning()).toBe(false)
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
