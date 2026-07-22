import { CHANNELS } from '@shared/ipc/channels'
import { screenshotCaptureSchema, screenshotRecordSchema } from '@shared/ipc/schemas'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { ScreenshotService } from './service'

function registerScreenshotHandlers(ctx: AppContext, service: ScreenshotService): void {
  registerHandler(ctx, CHANNELS.SCREENSHOT_CAPTURE, screenshotCaptureSchema, function () {
    return service.capture()
  })
  registerHandler(ctx, CHANNELS.SCREENSHOT_RECORD_START, screenshotRecordSchema, function () {
    return service.recordStart()
  })
  registerHandler(ctx, CHANNELS.SCREENSHOT_RECORD_STOP, screenshotRecordSchema, function () {
    return service.recordStop()
  })
}

export { registerScreenshotHandlers }
