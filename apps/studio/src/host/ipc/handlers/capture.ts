import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/capture'
import type { Context } from '../../framework/context'
import type { OverlayWindowPort } from '../../capabilities/overlay-window'
import type { ThroughHost } from '../../capabilities/through'
import { type DomainHandlers } from '../types'

export function buildCaptureHandlers(
  ctx: Context,
  overlay: OverlayWindowPort,
  through: ThroughHost,
  serviceRef: { current: Service | null }
): DomainHandlers<'capture'> {
  function service(): Service {
    if (!serviceRef.current) {
      serviceRef.current = new Service(ctx.corex, overlay, through)
    }
    return serviceRef.current
  }

  return {
    [CHANNELS.CAPTURE.SCREENSHOT]: function () {
      return service().screenshot()
    },
    [CHANNELS.CAPTURE.OPEN]: function () {
      return service().open()
    },
    [CHANNELS.CAPTURE.CLOSE]: function () {
      service().close()
    },
    [CHANNELS.CAPTURE.RECORDER]: function () {
      service().recorder()
    }
  }
}
