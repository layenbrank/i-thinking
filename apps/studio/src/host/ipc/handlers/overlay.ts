import { CHANNELS } from '@/shared/ipc/channels'
import { type OverlayWindowPort } from '@/host/capabilities/overlay/window-port'
import { type DomainHandlers } from '@/host/ipc/types'

/**
 * overlay 频道：显隐 + mode。窗口本身由 window 插件创建。
 */
export function buildOverlayHandlers(overlay: OverlayWindowPort): DomainHandlers<'overlay'> {
  return {
    [CHANNELS.OVERLAY.READ]: function () {
      return overlay.toRead()
    },
    [CHANNELS.OVERLAY.UPDATE]: function (input) {
      overlay.toUpdate(input)
    }
  }
}
