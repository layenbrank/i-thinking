import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { findStatus } from './status'

function registerHandlers(ctx: AppContext): void {
  registerHandler(ctx, CHANNELS.SIDECAR.FIND_STATUS, null, function () {
    return findStatus(ctx.corex)
  })
}

export { registerHandlers }
