import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { sidecarExecSchema, sidecarNameSchema } from '@shared/ipc/schemas'
import type { SidecarService } from './service'

function registerSidecarHandlers(ctx: AppContext, service: SidecarService): void {
  registerHandler(ctx, CHANNELS.SIDECAR_FIND_PATH, sidecarNameSchema, function (input) {
    return service.findPath(input.name)
  })
  registerHandler(ctx, CHANNELS.SIDECAR_EXEC, sidecarExecSchema, function (input) {
    return service.exec(input.name, input.args)
  })
}

export { registerSidecarHandlers }
