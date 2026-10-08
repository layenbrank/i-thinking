import { Service } from '@/host/capabilities/capture'
import type { ThroughHost } from '@/host/capabilities/overlay/through'
import type { OverlayWindowPort } from '@/host/capabilities/overlay/window-port'
import type { CorexHost } from '@/host/capabilities/sidecar'
import { type DomainHandlers } from '@/host/ipc/types'
import { CHANNELS } from '@/shared/ipc/channels'

export function buildCaptureHandlers(
  sidecar: CorexHost,
  overlay: OverlayWindowPort,
  through: ThroughHost,
  serviceRef: { current: Service | null }
): DomainHandlers<'capture'> {
  function service(): Service {
    if (!serviceRef.current) {
      serviceRef.current = new Service(sidecar, overlay, through)
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
