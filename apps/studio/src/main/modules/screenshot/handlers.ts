import { CHANNELS } from '@shared/ipc/channels'
import { CaptureSchema } from '@shared/ipc/screenshot'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.SCREENSHOT.CAPTURE, CaptureSchema, function () {
    return service.capture()
  })
}

export { registerHandlers }
