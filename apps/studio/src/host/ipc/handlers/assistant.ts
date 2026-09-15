import { CHANNELS } from '../../../shared/ipc/channels'
import { IpcError } from '../../../shared/ipc/error'
import { buildKeyStore, connect } from '../../capabilities/assistant'
import { Repository as ChatRepository } from '../../capabilities/chat'
import type { Context } from '../../framework/context'
import type { DomainHandlers } from '../types'

export function buildAssistantHandlers(ctx: Context): DomainHandlers<'assistant'> {
  const log = ctx.logger.child('assistant')
  const chat = new ChatRepository()
  const keys = buildKeyStore()

  return {
    [CHANNELS.ASSISTANT.CONNECT]: function (_input, event) {
      const frame = event.senderFrame
      if (!frame) {
        throw new IpcError('ASSISTANT_FRAME_UNAVAILABLE', '无可用的 senderFrame')
      }
      connect(frame, event.sender, keys, chat, log)
    },
    [CHANNELS.ASSISTANT.KEY.WRITE]: function (input) {
      keys.toWrite(input.providerID, input.apiKey)
    },
    [CHANNELS.ASSISTANT.KEY.HAS]: function (input) {
      return keys.has(input.providerID)
    },
    [CHANNELS.ASSISTANT.KEY.REMOVE]: function (input) {
      keys.toRemove(input.providerID)
    }
  }
}
