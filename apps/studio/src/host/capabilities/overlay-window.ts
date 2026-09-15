import { screen } from 'electron'
import type { BrowserWindow } from 'electron'

/**
 * overlay 窗口的读写端口。
 *
 * 窗口本身由 `window.ts` 的插件创建与销毁，但两个频道（`overlay:toRead` /
 * `overlay:toUpdate`）的 handler 需要操作它。把窗口引用收进这个 port，
 * 让**窗口生命周期**与**频道实现**各归其位，两边共用同一份实现而不是各写一遍。
 */
export interface OverlayWindowPort {
  /** 由 window 插件在创建/销毁窗口时调用 */
  attach(win: BrowserWindow | null): void
  toRead(): { visible: boolean }
  toUpdate(visible: boolean): void
}

export function buildOverlayWindowPort(): OverlayWindowPort {
  let overlayWindow: BrowserWindow | null = null

  return {
    attach(next) {
      overlayWindow = next
    },

    toRead() {
      const win = overlayWindow
      return {
        visible: win !== null && !win.isDestroyed() && win.isVisible()
      }
    },

    toUpdate(visible) {
      const win = overlayWindow
      if (!win || win.isDestroyed()) {
        throw new Error('overlay window unavailable')
      }

      if (visible) {
        win.setBounds(screen.getPrimaryDisplay().workArea)
        win.setFocusable(true)
        win.setSkipTaskbar(true)
        win.show()
        return
      }

      win.hide()
      win.setFocusable(false)
    }
  }
}
