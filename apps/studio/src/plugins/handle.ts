import type { IpcMainInvokeEvent } from 'electron'
import type { ZodType } from 'zod'

import type { Context } from './context'
import { ipcFail, ipcOk, type IpcResult } from './result'
import { isTrustedSender } from './trusted-sender'

export function registerHandler<TInput, TOutput>(
  ctx: Context,
  channel: string,
  schema: ZodType<TInput> | null,
  run: (input: TInput, event: IpcMainInvokeEvent) => Promise<TOutput> | TOutput
): void {
  const log = ctx.logger.child('ipc')

  ctx.ipc.handle(channel, async function (event, raw: unknown): Promise<IpcResult<TOutput>> {
    if (!isTrustedSender(ctx, event)) {
      log.warn('rejected untrusted sender', { channel })
      return ipcFail('IPC_UNTRUSTED_SENDER', 'Untrusted IPC sender')
    }

    let input: TInput
    if (schema) {
      const parsed = schema.safeParse(raw ?? undefined)
      if (!parsed.success) {
        return ipcFail('IPC_INVALID_PAYLOAD', parsed.error.message)
      }
      input = parsed.data
    } else {
      input = undefined as TInput
    }

    try {
      const data = await run(input, event)
      return ipcOk(data)
    } catch (error) {
      log.error(`handler failed: ${channel}`, error)
      const message = error instanceof Error ? error.message : 'Unknown error'
      return ipcFail('IPC_HANDLER_ERROR', message)
    }
  })
}
