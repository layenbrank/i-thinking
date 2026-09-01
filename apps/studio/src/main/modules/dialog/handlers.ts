import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { OpenSchema, SaveSchema } from '@shared/ipc/dialog'
import type { Service } from './service'

function registerHandlers(ctx: Context, service: Service): void {
  registerHandler(ctx, CHANNELS.DIALOG.OPEN, OpenSchema, function (input) {
    return service.open(input)
  })
  registerHandler(ctx, CHANNELS.DIALOG.SAVE, SaveSchema, function (input) {
    return service.save(input)
  })
}

export { registerHandlers }
