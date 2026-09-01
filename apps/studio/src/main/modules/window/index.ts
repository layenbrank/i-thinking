import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { attachGuards as attachWindowGuards } from '@main/modules/security'
import { findBundleDir } from '@main/paths'
import { CHANNELS } from '@shared/ipc/channels'
import { BrowserWindow } from 'electron'
import path from 'node:path'

declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string | undefined
declare const MAIN_WINDOW_VITE_NAME: string

function buildModule(): StudioModule {
  return {
    name: 'window',
    register(ctx: Context) {
      const log = ctx.logger.child('window')

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        try {
          const origin = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
          ctx.toUpdateOrigins([origin])
        } catch {
          ctx.toUpdateOrigins([])
        }
      }

      function buildWindow() {
        const publicDir = process.env.VITE_PUBLIC ?? ''
        const bundleDir = findBundleDir()
        const htmlPath = path.join(bundleDir, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
        const preloadPath = path.join(bundleDir, 'preload.js')

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
          icon: publicDir ? path.join(publicDir, 'electron-vite.svg') : undefined,
          webPreferences: {
            minimumFontSize: 12,
            defaultFontSize: 16,
            spellcheck: true,
            defaultEncoding: 'utf-8',
            webgl: true,
            webSecurity: true,
            allowRunningInsecureContent: false,
            devTools: ctx.isDev,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
            preload: preloadPath
          }
        })

        ctx.toUpdateWindow(win)
        ctx.trustWebContents(win.webContents)
        attachWindowGuards(ctx, win.webContents)

        win.once('ready-to-show', function () {
          if (!win.isDestroyed()) {
            win.show()
          }
        })

        win.webContents.on('did-finish-load', function () {
          if (!win.isDestroyed()) {
            win.webContents.send(CHANNELS.APP.MESSAGE, new Date().toLocaleString())
          }
        })

        win.webContents.on('did-fail-load', function (_event, code, desc, url) {
          log.error('did-fail-load', { code, desc, url })
          if (!win.isDestroyed() && !win.isVisible()) {
            win.show()
          }
        })

        if (ctx.isDev) win.webContents.openDevTools()

        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
          void win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
        } else {
          void win.loadFile(htmlPath)
        }

        win.on('close', function () {
          if (!win.isDestroyed()) {
            ctx.untrustWebContents(win.webContents)
          }
        })
        win.on('closed', function () {
          if (ctx.toReadWindow() === win) {
            ctx.toUpdateWindow(null)
          }
        })

        log.info('main window created')
        return win
      }

      ctx.app.on('window-all-closed', function () {
        if (process.platform !== 'darwin') {
          ctx.app.quit()
        }
      })

      ctx.app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) {
          buildWindow()
        }
      })

      buildWindow()
    }
  }
}

export { buildModule }
