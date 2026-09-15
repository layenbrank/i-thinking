import { CHANNELS } from '../../../shared/ipc/channels'
import { findStatus } from '../../capabilities/sidecar'
import { type Context } from '../../framework/context'
import { type DomainHandlers } from '../types'

export function buildSidecarHandlers(ctx: Context): DomainHandlers<'sidecar'> {
  return {
    [CHANNELS.SIDECAR.READ]: function () {
      return findStatus(ctx.corex)
    }
  }
}
