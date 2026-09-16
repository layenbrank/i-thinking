import type { IpcMainInvokeEvent } from 'electron'
import { beforeEach, describe, expect, it } from 'vitest'

import type { InvokeChannel } from '../../shared/ipc/channels'
import { CHANNELS, INVOKE_CHANNELS } from '../../shared/ipc/channels'
import { IpcError, type IpcEnvelope } from '../../shared/ipc/error'
import type { Context } from '../framework/context'
import { assertExhaustive, registerAll, type IpcDisposable } from './register'
import type { Handlers } from './types'

const PAGE_URL = 'file:///app/index.html'

/** 与 capabilities/trusted-sender.test.ts 同款的 ctx 桩 */
function stubCtx(partial: Partial<Context> & Pick<Context, 'isDev'>): Context {
  return {
    app: {} as Context['app'],
    ipc: {} as Context['ipc'],
    logger: {
      debug() {},
      info() {},
      warn() {},
      error() {},
      child() {
        return this
      }
    },
    corex: {} as Context['corex'],
    toReadWindow() {
      return null
    },
    toUpdateWindow() {},
    trustWebContents() {},
    untrustWebContents() {},
    isTrustedWebContents() {
      return true
    },
    toReadOrigins() {
      return []
    },
    toUpdateOrigins() {},
    ...partial
  }
}

function stubEvent(): IpcMainInvokeEvent {
  return {
    sender: {
      isDestroyed: function () {
        return false
      },
      getURL: function () {
        return PAGE_URL
      }
    },
    senderFrame: { url: PAGE_URL }
  } as unknown as IpcMainInvokeEvent
}

/** 假 IpcMain：只实现 registerAll 用到的面，并对重复频道抛错（同 Electron 行为） */
function buildFakeIpc() {
  const registered = new Map<string, (event: unknown, raw: unknown) => Promise<unknown>>()

  return {
    handle(channel: string, fn: (event: unknown, raw: unknown) => Promise<unknown>) {
      if (registered.has(channel)) {
        throw new Error(`Attempted to register a second handler for '${channel}'`)
      }
      registered.set(channel, fn)
    },
    removeHandler(channel: string) {
      registered.delete(channel)
    },
    invoke(channel: string, raw?: unknown) {
      const fn = registered.get(channel)
      if (!fn) throw new Error(`No handler registered for '${channel}'`)
      return fn(stubEvent(), raw)
    },
    size() {
      return registered.size
    },
    has(channel: string) {
      return registered.has(channel)
    }
  }
}

/** 全通道返回 null 的合法 handler 表；测试只关心 wrapper 的行为 */
function stubHandlers(overrides: Partial<Record<InvokeChannel, unknown>> = {}): Handlers {
  const base: Record<string, unknown> = {}
  for (const channel of INVOKE_CHANNELS) {
    base[channel] = async function () {
      return null
    }
  }
  for (const [channel, handler] of Object.entries(overrides)) {
    base[channel] = handler
  }
  return base as Handlers
}

function failureOf(envelope: unknown): { code: string; details?: unknown } {
  const typed = envelope as IpcEnvelope<unknown>
  if (typed.ok) throw new Error('expected a failure envelope')
  return { code: typed.error.code, details: typed.error.details }
}

describe('registerAll', function () {
  let ipc: ReturnType<typeof buildFakeIpc>
  let disposable: IpcDisposable

  beforeEach(function () {
    ipc = buildFakeIpc()
  })

  it('registers exactly the invoke channels and nothing else', function () {
    disposable = registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())

    expect(ipc.size()).toBe(INVOKE_CHANNELS.length)
    expect(ipc.size()).toBe(56)
    for (const channel of INVOKE_CHANNELS) {
      expect(ipc.has(channel)).toBe(true)
    }
    // 推送通道不得被注册为 invoke
    expect(ipc.has(CHANNELS.ASSISTANT.PORT)).toBe(false)
    expect(ipc.has(CHANNELS.UPDATER.EVENT)).toBe(false)
  })

  it('maps a business IpcError to its own code', async function () {
    disposable = registerAll(
      ipc as never,
      stubCtx({ isDev: false }),
      stubHandlers({
        [CHANNELS.USER.READ]: function () {
          throw new IpcError('USER_RECORD_NOT_FOUND', '记录不存在: u1')
        }
      })
    )

    const envelope = await ipc.invoke(CHANNELS.USER.READ)
    expect(failureOf(envelope).code).toBe('USER_RECORD_NOT_FOUND')
  })

  it('maps an unexpected throw to IPC_HANDLER_ERROR', async function () {
    disposable = registerAll(
      ipc as never,
      stubCtx({ isDev: false }),
      stubHandlers({
        [CHANNELS.USER.READ]: function () {
          throw new TypeError('undefined is not a function')
        }
      })
    )

    const envelope = (await ipc.invoke(CHANNELS.USER.READ)) as IpcEnvelope<unknown>
    expect(failureOf(envelope).code).toBe('IPC_HANDLER_ERROR')
    if (envelope.ok) throw new Error('expected failure')
    expect(envelope.error.name).toBe('TypeError')
  })

  it('rejects an untrusted sender before running the handler', async function () {
    let ran = false
    disposable = registerAll(
      ipc as never,
      stubCtx({
        isDev: false,
        isTrustedWebContents() {
          return false
        }
      }),
      stubHandlers({
        [CHANNELS.STORE.KEYS]: function () {
          ran = true
          return []
        }
      })
    )

    const envelope = await ipc.invoke(CHANNELS.STORE.KEYS)
    expect(failureOf(envelope).code).toBe('IPC_UNTRUSTED_SENDER')
    expect(ran).toBe(false)
  })

  it('rejects an invalid payload with clone-safe details', async function () {
    disposable = registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())

    // store:toRead 需要 { key: string }，这里不传
    const envelope = await ipc.invoke(CHANNELS.STORE.READ)
    const failure = failureOf(envelope)

    expect(failure.code).toBe('IPC_INVALID_PAYLOAD')
    expect(Array.isArray(failure.details)).toBe(true)
    expect(function () {
      structuredClone(failure.details)
    }).not.toThrow()
  })

  it('keeps every failure envelope structured-clone safe', async function () {
    disposable = registerAll(
      ipc as never,
      stubCtx({ isDev: true }),
      stubHandlers({
        [CHANNELS.USER.READ]: function () {
          throw new IpcError('USER_RECORD_NOT_FOUND', '记录不存在', { details: { id: 'u1' } })
        },
        [CHANNELS.STORE.KEYS]: function () {
          throw new Error('boom')
        }
      })
    )

    const envelopes = [
      await ipc.invoke(CHANNELS.USER.READ),
      await ipc.invoke(CHANNELS.STORE.KEYS),
      await ipc.invoke(CHANNELS.STORE.READ) // 非法 payload
    ]

    for (const envelope of envelopes) {
      expect(function () {
        structuredClone(envelope)
      }).not.toThrow()
    }
  })

  it('lets ipcMain reject a duplicate registration', function () {
    registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())
    expect(function () {
      registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())
    }).toThrow(/second handler/)
  })

  describe('dispose', function () {
    it('removes every owned handler and is idempotent', function () {
      disposable = registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())
      expect(ipc.size()).toBe(56)

      disposable.dispose()
      expect(ipc.size()).toBe(0)

      disposable.dispose()
      expect(ipc.size()).toBe(0)
    })

    it('leaves handlers it does not own alone', function () {
      ipc.handle('some:foreign-channel', async function () {
        return null
      })

      disposable = registerAll(ipc as never, stubCtx({ isDev: false }), stubHandlers())
      disposable.dispose()

      expect(ipc.has('some:foreign-channel')).toBe(true)
      expect(ipc.size()).toBe(1)
    })
  })
})

describe('assertExhaustive', function () {
  it('throws when a handler is missing, naming it', function () {
    const handlers = stubHandlers() as Record<string, unknown>
    delete handlers[CHANNELS.STORE.KEYS]

    expect(function () {
      assertExhaustive(handlers as unknown as Handlers)
    }).toThrow(new RegExp(CHANNELS.STORE.KEYS))
  })

  it('passes for a complete table', function () {
    expect(function () {
      assertExhaustive(stubHandlers())
    }).not.toThrow()
  })
})
