import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { execSchema, nameSchema } from './schemas'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.SIDECAR.FIND_PATH, nameSchema, function (input) {
    return service.findPath(input.name)
  })
  registerHandler(ctx, CHANNELS.SIDECAR.EXEC, execSchema, function (input) {
    return service.exec(input.name, input.args)
  })
}

export { registerHandlers }
