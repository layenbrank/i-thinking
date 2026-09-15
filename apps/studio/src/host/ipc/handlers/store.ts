import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/store'
import type { DomainHandlers } from '../types'

export function buildStoreHandlers(): DomainHandlers<'store'> {
  const service = new Service()

  return {
    [CHANNELS.STORE.READ]: function (input) {
      return service.toRead(input.key)
    },
    [CHANNELS.STORE.WRITE]: function (input) {
      service.toWrite(input.key, input.value)
    },
    [CHANNELS.STORE.HAS]: function (input) {
      return service.has(input.key)
    },
    [CHANNELS.STORE.REMOVE]: function (input) {
      service.toRemove(input.key)
    },
    [CHANNELS.STORE.CLEAR]: function () {
      service.clear()
    },
    [CHANNELS.STORE.KEYS]: function () {
      return service.keys()
    }
  }
}
