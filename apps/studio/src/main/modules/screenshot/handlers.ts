import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { CaptureSchema } from '@shared/ipc/screenshot'
import type { Service } from './service'

function registerHandlers(ctx: Context, service: Service): void {
  registerHandler(ctx, CHANNELS.SCREENSHOT.CAPTURE, CaptureSchema, function () {
    return service.capture()
  })
}

export { registerHandlers }
