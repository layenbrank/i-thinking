import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { openSchema, saveSchema } from './schemas'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.DIALOG.OPEN, openSchema, function (input) {
    return service.open(input)
  })
  registerHandler(ctx, CHANNELS.DIALOG.SAVE, saveSchema, function (input) {
    return service.save(input)
  })
}

export { registerHandlers }
