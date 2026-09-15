import { CHANNELS } from '../../../shared/ipc/channels'
import { type OverlayWindowPort } from '../../capabilities/overlay-window'
import { type DomainHandlers } from '../types'

/**
 * overlay 两个频道的实现。窗口本身由 window 插件创建/销毁，
 * 经 `OverlayWindowPort` 读写 —— 两边共用同一份逻辑。
 */
export function buildOverlayHandlers(overlay: OverlayWindowPort): DomainHandlers<'overlay'> {
  return {
    [CHANNELS.OVERLAY.READ]: function () {
      return overlay.toRead()
    },
    [CHANNELS.OVERLAY.UPDATE]: function (input) {
      overlay.toUpdate(input.visible)
    }
  }
}
