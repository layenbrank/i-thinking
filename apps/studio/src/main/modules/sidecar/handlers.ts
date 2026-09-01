import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { findStatus } from './status'

function registerHandlers(ctx: Context): void {
  registerHandler(ctx, CHANNELS.SIDECAR.FIND_STATUS, null, function () {
    return findStatus(ctx.corex)
  })
}

export { registerHandlers }
