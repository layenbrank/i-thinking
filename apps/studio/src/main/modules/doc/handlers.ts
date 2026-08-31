import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { ConvertSchema } from '@shared/ipc/doc'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.DOC.CONVERT, ConvertSchema, function (input) {
    return service.convert(input)
  })
}

export { registerHandlers }
