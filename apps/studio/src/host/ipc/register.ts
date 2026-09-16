import { type IpcMain, type IpcMainInvokeEvent } from 'electron'

import { INVOKE_CHANNELS } from '../../shared/ipc/channels'
import { type InvokeChannel } from '../../shared/ipc/channels'
import {
  envelopeFail,
  envelopeOk,
  IpcError,
  toErrorPayload,
  toZodDetails,
  type IpcEnvelope
} from '../../shared/ipc/error'
import { INVOKE_SPECS } from '../../shared/ipc/specs'
import { type Out } from '../../shared/ipc/specs'
import { isTrustedSender } from '../capabilities/trusted-sender'
import { type Context } from '../framework/context'
import { type Handler, type Handlers } from './types'

export interface IpcDisposable {
  dispose(): void
}

/**
 * 单频道的四道关卡：sender 校验 → schema 解析 → 调用 handler → 错误归一。
 *
 * 失败一律走信封（不 reject）—— Electron 会丢弃跨 IPC 抛出错误的身份，
 * 信封里的结构化 code 是唯一能活着到渲染侧的诊断信息。
 */
function wrapHandler<K extends InvokeChannel>(ctx: Context, channel: K, handler: Handler<K>) {
  const log = ctx.logger.child('ipc')
  const spec = INVOKE_SPECS[channel]

  return async function (event: IpcMainInvokeEvent, raw: unknown): Promise<IpcEnvelope<Out<K>>> {
    if (!isTrustedSender(ctx, event)) {
      log.warn('rejected untrusted sender', { channel })
      return envelopeFail({
        code: 'IPC_UNTRUSTED_SENDER',
        name: 'IpcError',
        message: 'Untrusted IPC sender'
      })
    }

    const parsed = spec.in.safeParse(raw ?? undefined)
    if (!parsed.success) {
      return envelopeFail({
        code: 'IPC_INVALID_PAYLOAD',
        name: 'IpcError',
        message: parsed.error.message,
        details: toZodDetails(parsed.error)
      })
    }

    try {
      const data = await handler(parsed.data as never, event)
      return envelopeOk(data as Out<K>)
    } catch (error) {
      const payload = toErrorPayload(error, { isDev: ctx.isDev })
      if (error instanceof IpcError) {
        log.info(`business failure: ${channel}`, { code: payload.code })
      } else {
        log.error(`handler failed: ${channel}`, error)
      }
      return envelopeFail(payload)
    }
  }
}

/**
 * 契约完整性断言。**在任何 `ipc.handle` 之前调用** —— 失败快，
 * 不会留下"注册了一半"的应用。
 *
 * `ipcMain.handle` 对重复频道会 throw（那是重复注册的探测器），
 * 这里先挡住更常见的"漏一个"。
 */
export function assertExhaustive(handlers: Handlers): void {
  const missingHandlers = INVOKE_CHANNELS.filter(function (channel) {
    return typeof handlers[channel] !== 'function'
  })
  const missingSpecs = INVOKE_CHANNELS.filter(function (channel) {
    return INVOKE_SPECS[channel] === undefined
  })

  if (missingHandlers.length > 0 || missingSpecs.length > 0) {
    throw new Error(
      'IPC contract incomplete: ' +
        `missing handlers [${missingHandlers.join(', ')}], ` +
        `missing specs [${missingSpecs.join(', ')}]`
    )
  }
}

/**
 * 遍历契约注册全部 invoke 通道。
 *
 * 频道字符串的**唯一来源是契约** —— 这里不出现任何字面量，
 * 因此不可能出现"注册了契约里没有的频道"或反过来。
 *
 * 返回幂等 `Disposable`：LIFO 拆除，且只拆自己注册的。
 */
export function registerAll(ipc: IpcMain, ctx: Context, handlers: Handlers): IpcDisposable {
  assertExhaustive(handlers)

  const owned: InvokeChannel[] = []
  for (const channel of INVOKE_CHANNELS) {
    const wrapped = wrapHandler(ctx, channel, handlers[channel])
    ipc.handle(channel, wrapped as never)
    owned.push(channel)
  }

  let disposed = false
  return {
    dispose() {
      if (disposed) return
      disposed = true
      for (let i = owned.length - 1; i >= 0; i -= 1) {
        ipc.removeHandler(owned[i])
      }
      owned.length = 0
    }
  }
}
