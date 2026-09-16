import { BrowserWindow, screen } from 'electron'

import { type Context } from '../framework/context'
import { type Plugin } from '../framework/module'
import { type OverlayWindowPort } from './overlay-window'
import { attachLifecycle, buildWebPreferences, findBundlePaths, toRedirect } from './window-factory'

function findWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

/**
 * 主窗口的显隐端口。
 *
 * 托盘和「二次启动」都需要「把主窗口叫出来」，而窗口引用握在 window 插件手里 ——
 * 与 overlay 同一套做法：插件在创建/销毁时 `attach`，外部只表达意图。
 *
 * 主窗口运行时**只会被隐藏、不会被销毁**（关闭 = 收进托盘），所以这里不需要「重建窗口」那条路。
 */
interface MainWindowPort {
  attach(win: BrowserWindow | null): void
  /** 显示并聚焦主窗口（最小化则先恢复） */
  toReveal(): void
}

function buildMainWindowPort(): MainWindowPort {
  let mainWindow: BrowserWindow | null = null

  return {
    attach(next) {
      mainWindow = next
    },

    toReveal() {
      const win = mainWindow
      if (!win || win.isDestroyed()) return
      if (win.isMinimized()) win.restore()
      win.show()
      win.focus()
    }
  }
}

interface WindowPlugin extends Plugin {
  /** 供给托盘 / 二次启动：把主窗口叫出来 */
  mainWindow: MainWindowPort
}

function buildPlugin(overlay: OverlayWindowPort): WindowPlugin {
  const mainWindow = buildMainWindowPort()
  /** 真退出时才放行关闭；否则「关闭」= 收进托盘（托盘里有「退出」） */
  let isQuitting = false

  return {
    name: 'window',
    mainWindow,
    register(ctx: Context) {
      const log = ctx.logger.child('window')
      const paths = findBundlePaths()

      ctx.app.on('before-quit', function () {
        isQuitting = true
      })

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        try {
          const origin = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
          ctx.toUpdateOrigins([origin])
        } catch (error) {
          console.warn('[window] VITE_DEV_SERVER_URL 不是合法 URL，不放开任何 origin', error)
          ctx.toUpdateOrigins([])
        }
      }

      function buildMainWindow() {
        const win = new BrowserWindow({
          width: 1200,
          height: 800,
          minWidth: 800,
          minHeight: 600,
          show: false,
          fullscreen: false,
          minimizable: true,
          maximizable: true,
          resizable: true,
          transparent: false,
          center: true,
          hasShadow: true,
          backgroundColor: '#00000000',
          title: 'i thinking',
          frame: true,
          backgroundMaterial: 'mica',
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: '#00000000',
            height: 35,
            symbolColor: '#000000'
          },
          icon: paths.iconPath,
          webPreferences: buildWebPreferences(ctx, paths.preloadPath)
        })

        ctx.toUpdateWindow(win)
        mainWindow.attach(win)

        // 必须先于 attachLifecycle 注册：它按注册顺序跑，而它要在同一次 close 里
        // 看到 `event.defaultPrevented` 才不撤信任（撤了这窗口就再也发不出 IPC）
        win.on('close', function (event) {
          if (isQuitting) return
          event.preventDefault()
          win.hide()
        })

        attachLifecycle(ctx, win, log)
        toRedirect(win, paths.route)

        win.on('closed', function () {
          if (ctx.toReadWindow() === win) ctx.toUpdateWindow(null)
          mainWindow.attach(null)
        })

        log.info('main window created')
        return win
      }

      function buildOverlayWindow() {
        const area = findWorkArea()

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

        overlay.attach(win)
        attachLifecycle(ctx, win, log, { isAutoShow: false })
        toRedirect(win, paths.route, '/overlay')

        win.on('closed', function () {
          overlay.attach(null)
        })

        log.info('overlay window created')
        return win
      }

      ctx.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') ctx.app.quit()
      })

      ctx.app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
          buildMainWindow()
          buildOverlayWindow()
        }
      })

      buildMainWindow()
      buildOverlayWindow()
    }
  }
}

export { buildPlugin }
export type { MainWindowPort, WindowPlugin }
