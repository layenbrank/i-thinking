import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/screenshot'
import { type Context } from '../../framework/context'
import { type DomainHandlers } from '../types'

export function buildScreenshotHandlers(ctx: Context): DomainHandlers<'screenshot'> {
  const service = new Service(ctx.corex)

  return {
    [CHANNELS.SCREENSHOT.CAPTURE]: function () {
      return service.capture()
    }
  }
}
