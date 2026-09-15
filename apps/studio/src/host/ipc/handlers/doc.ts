import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/doc'
import { type DomainHandlers } from '../types'

export function buildDocHandlers(): DomainHandlers<'doc'> {
  const service = new Service()

  return {
    [CHANNELS.DOC.CONVERT]: function (input) {
      return service.convert(input)
    }
  }
}
