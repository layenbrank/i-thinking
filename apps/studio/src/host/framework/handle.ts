import type { IpcMainInvokeEvent } from 'electron'
import type { ZodType } from 'zod'

import type { Context } from './context'
import {
  envelopeFail,
  envelopeOk,
  IpcError,
  toErrorPayload,
  toZodDetails,
  type IpcEnvelope
} from '../../shared/ipc/error'
import { isTrustedSender } from '../capabilities/trusted-sender'

/**
 * IPC handler 注册。三道关卡：sender 校验 → schema 解析 → 归一化错误。
 *
 * 失败一律走信封而非 reject —— 但 **code 是有区分的**：
 * - 传输层问题：IPC_UNTRUSTED_SENDER / IPC_INVALID_PAYLOAD
 * - 业务失败（handler 抛 `IpcError`）：用其自带 code，按 info 记日志
 * - 编程错误 / 未预期异常：IPC_HANDLER_ERROR，按 error 记日志并带堆栈
 */
export function registerHandler<TInput, TOutput>(
  ctx: Context,
  channel: string,
  schema: ZodType<TInput> | null,
  run: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput> | TOutput
): void {
  const log = ctx.logger.child('ipc')

  ctx.ipc.handle(channel, async function (event, raw: unknown): Promise<IpcEnvelope<TOutput>> {
    if (!isTrustedSender(ctx, event)) {
      log.warn('rejected untrusted sender', { channel })
      return envelopeFail({
        code: 'IPC_UNTRUSTED_SENDER',
        name: 'IpcError',
        message: 'Untrusted IPC sender'
      })
    }

    let input: TInput
    if (schema) {
      const parsed = schema.safeParse(raw ?? undefined)
      if (!parsed.success) {
        return envelopeFail({
          code: 'IPC_INVALID_PAYLOAD',
          name: 'IpcError',
          message: parsed.error.message,
          details: toZodDetails(parsed.error)
        })
      }
      input = parsed.data
    } else {
      input = undefined as TInput
    }

    try {
      const data = await run(input, event)
      return envelopeOk(data)
    } catch (error) {
      const payload = toErrorPayload(error, { isDev: ctx.isDev })
      if (error instanceof IpcError) {
        log.info(`business failure: ${channel}`, { code: payload.code })
      } else {
        log.error(`handler failed: ${channel}`, error)
      }
      return envelopeFail(payload)
    }
  })
}
