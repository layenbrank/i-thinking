import { BrowserWindow, screen } from 'electron'

import { CHANNELS } from '../../shared/ipc/channels'
import type { PushOut } from '../../shared/ipc/specs'
import type { Context } from '../framework/context'
import { attachLifecycle, buildWebPreferences, findBundlePaths, toRedirect } from './window-factory'

type OverlayMode = 'idle' | 'capture'
type OverlayEvent = PushOut<typeof CHANNELS.OVERLAY.EVENT>

interface OverlayUpdate {
  visible?: boolean
  mode?: OverlayMode
}

interface OverlayWindowPort {
  toCreate(): void
  toRead(): { visible: boolean; mode: OverlayMode }
  toUpdate(input: OverlayUpdate): void
  toConceal(): void
  toReveal(): void
  toPushEvent(event: OverlayEvent): void
  findWindow(): BrowserWindow | null
}

function findWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

function buildOverlayWindowPort(ctx: Context): OverlayWindowPort {
  let overlayWindow: BrowserWindow | null = null
  let mode: OverlayMode = 'idle'

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
      skipTaskbar: process.env.NODE_ENV === 'development' ? false : true,
      alwaysOnTop: process.env.NODE_ENV === 'development' ? false : true,
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

  function push(event: OverlayEvent): void {
    const win = overlayWindow
    if (!win || win.isDestroyed()) return
    win.webContents.send(CHANNELS.OVERLAY.EVENT, event)
  }

  return {
    toCreate() {
      const existing = overlayWindow
      if (existing && !existing.isDestroyed()) return
      overlayWindow = buildWindow()
    },

    findWindow() {
      const win = overlayWindow
      if (!win || win.isDestroyed()) return null
      return win
    },

    toRead() {
      const win = overlayWindow
      return {
        visible: win !== null && !win.isDestroyed() && win.isVisible(),
        mode
      }
    },

    toUpdate(input) {
      // 关过 / 尚未建窗时自动 ensure，避免主窗 OverlayAction 抛 OVERLAY_UNAVAILABLE
      if (!overlayWindow || overlayWindow.isDestroyed()) {
        overlayWindow = buildWindow()
      }
      const win = overlayWindow

      if (input.mode !== undefined && input.mode !== mode) {
        mode = input.mode
        push({ type: 'mode', mode })
      }

      if (input.visible === true) {
        win.setBounds(findWorkArea())
        win.setAlwaysOnTop(true, 'screen-saver')
        win.setSkipTaskbar(true)
        if (mode === 'capture') {
          win.setIgnoreMouseEvents(false)
          win.setFocusable(true)
          win.show()
          win.focus()
        } else {
          // idle：默认整窗穿透，等 through 按 data-region=false 的 hit-rects 局部收回
          win.setIgnoreMouseEvents(true, { forward: true })
          win.setFocusable(true)
          win.show()
        }
        return
      }

      if (input.visible === false) {
        win.hide()
        win.setFocusable(false)
        mode = 'idle'
        push({ type: 'mode', mode: 'idle' })
      }
    },

    toConceal() {
      push({ type: 'conceal' })
    },

    toReveal() {
      push({ type: 'reveal' })
    },

    toPushEvent(event) {
      push(event)
    }
  }
}

export { buildOverlayWindowPort }
export type { OverlayWindowPort, OverlayMode, OverlayUpdate }
