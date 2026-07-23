import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { captureSchema, recordSchema } from './schemas'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.SCREENSHOT.CAPTURE, captureSchema, function () {
    return service.capture()
  })
  registerHandler(ctx, CHANNELS.SCREENSHOT.RECORD_START, recordSchema, function () {
    return service.recordStart()
  })
  registerHandler(ctx, CHANNELS.SCREENSHOT.RECORD_STOP, recordSchema, function () {
    return service.recordStop()
  })
}

export { registerHandlers }
