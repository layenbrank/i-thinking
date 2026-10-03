import { CHANNELS } from '../../../shared/ipc/channels'
import type { ThroughHost } from '../../capabilities/through'
import { type DomainHandlers } from '../types'

export function buildThroughHandlers(through: ThroughHost): DomainHandlers<'through'> {
  return {
    [CHANNELS.THROUGH.UPDATE_RECTS]: function (input) {
      through.updateRects(input.source, input.rects)
    }
  }
}
