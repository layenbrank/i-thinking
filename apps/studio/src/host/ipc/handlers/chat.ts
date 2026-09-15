import { CHANNELS } from '../../../shared/ipc/channels'
import { Repository } from '../../capabilities/chat'
import { type DomainHandlers } from '../types'

export function buildChatHandlers(): DomainHandlers<'chat'> {
  const chat = new Repository()

  return {
    [CHANNELS.CHAT.PROVIDER.READ]: function () {
      return chat.findProviders()
    },
    [CHANNELS.CHAT.PROVIDER.WRITE]: function (input) {
      return chat.writeProvider(input)
    },
    [CHANNELS.CHAT.PROVIDER.UPDATE]: function (input) {
      return chat.updateProvider(input)
    },
    [CHANNELS.CHAT.PROVIDER.REMOVE]: function (input) {
      return chat.removeProvider(input)
    },

    [CHANNELS.CHAT.SESSION.READ]: function () {
      return chat.findSessions()
    },
    [CHANNELS.CHAT.SESSION.WRITE]: function (input) {
      return chat.writeSession(input)
    },
    [CHANNELS.CHAT.SESSION.UPDATE]: function (input) {
      return chat.updateSession(input)
    },
    [CHANNELS.CHAT.SESSION.REMOVE]: function (input) {
      return chat.removeSession(input)
    },

    [CHANNELS.CHAT.MESSAGE.READ]: function (input) {
      return chat.findMessages(input)
    },
    [CHANNELS.CHAT.MESSAGE.APPEND]: function (input) {
      return chat.appendMessage(input)
    },
    [CHANNELS.CHAT.MESSAGE.UPDATE]: function (input) {
      return chat.updateMessage(input)
    },
    [CHANNELS.CHAT.MESSAGE.REMOVE]: function (input) {
      return chat.removeMessage(input)
    }
  }
}
