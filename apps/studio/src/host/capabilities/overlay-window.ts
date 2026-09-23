import { BrowserWindow, screen } from 'electron'

import { IpcError } from '../../shared/ipc/error'
import type { Context } from '../framework/context'
import { attachLifecycle, buildWebPreferences, findBundlePaths, toRedirect } from './window-factory'

/**
 * overlay 窗口的端口。
 *
 * 建、显、隐全归本端口：`window.ts` 只表达「该有 overlay 了」这个调度，
 * overlay 频道只表达「显示/隐藏」的意图。此前窗口建在 `window.ts`、几何却在两处各算一遍，
 * 改一处就漏一处。
 */
interface OverlayWindowPort {
  /** 建出 overlay 窗口；已建则不动（幂等，activate 重建路径要能安全重入） */
  toCreate(): void
  toRead(): { visible: boolean }
  toUpdate(visible: boolean): void
}

/** 浮层铺满主显示器工作区：建窗与唤起共用同一份几何 */
function findWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

function buildOverlayWindowPort(ctx: Context): OverlayWindowPort {
  let overlayWindow: BrowserWindow | null = null

  function buildWindow(): BrowserWindow {
    const area = findWorkArea()
    const paths = findBundlePaths()

    const win = new BrowserWindow({
      x: area.x,
      y: area.y,
      width: area.width,
      height: area.height,
      show: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: false,
      focusable: false,
      backgroundColor: '#00000000',
      title: 'overlay',
      icon: paths.iconPath,
      webPreferences: buildWebPreferences(ctx, paths.preloadPath)
    })

    const log = ctx.logger.child('window').child('overlay')
    attachLifecycle(ctx, win, log, { isAutoShow: false })
    toRedirect(win, paths.route, '/overlay')

    win.on('closed', function () {
      if (overlayWindow === win) overlayWindow = null
    })

    log.info('overlay window created')
    return win
  }

  return {
    toCreate() {
      const existing = overlayWindow
      if (existing && !existing.isDestroyed()) return
      overlayWindow = buildWindow()
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
        throw new IpcError('OVERLAY_UNAVAILABLE', 'overlay window unavailable')
      }

      if (visible) {
        win.setBounds(findWorkArea())
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

export { buildOverlayWindowPort }
export type { OverlayWindowPort }
