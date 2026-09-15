import { CHANNELS } from '../../../shared/ipc/channels'
import { Repository } from '../../capabilities/database'
import { type DomainHandlers } from '../types'

export function buildUserHandlers(): DomainHandlers<'user'> {
  const users = new Repository()

  return {
    [CHANNELS.USER.READ]: function () {
      return users.toRead()
    },
    [CHANNELS.USER.WRITE]: function (input) {
      return users.toWrite(input)
    },
    [CHANNELS.USER.UPDATE]: function (input) {
      return users.toUpdate(input)
    },
    [CHANNELS.USER.REMOVE]: function (input) {
      return users.toRemove(input)
    }
  }
}
