import { BrowserWindow, screen } from 'electron'
import path from 'node:path'

import type { Context } from './context'
import type { Plugin } from './module'
import { registerHandler } from './handle'
import { UpdateSchema } from './overlay'
import { attachGuards } from './security'
import { findBundleDir } from './paths'
import { CHANNELS } from './channels'

interface BundlePaths {
  route: string
  preloadPath: string
  iconPath?: string
}

interface LifecycleOpts {
  isFocusOnShow?: boolean
  isAutoShow?: boolean
}

function findBundlePaths(): BundlePaths {
  const publicDir = process.env.VITE_PUBLIC ?? ''
  const bundleDir = findBundleDir()
  return {
    route: path.join(bundleDir, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    preloadPath: path.join(bundleDir, 'preload.js'),
    iconPath: publicDir ? path.join(publicDir, 'electron-vite.svg') : undefined
  }
}

function findWorkArea() {
  return screen.getPrimaryDisplay().workArea
}

/** 开发态走 Vite URL，打包走 index.html；hash 为 Hash 路由路径，如 `/overlay` */
function toRedirect(win: BrowserWindow, route: string, hash?: string) {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    const url = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    if (hash) url.hash = `#${hash}`
    void win.loadURL(url.toString())
    return
  }

  if (hash) {
    void win.loadFile(route, { hash })
    return
  }

  void win.loadFile(route)
}

function toReveal(win: BrowserWindow, isFocusOnShow: boolean) {
  if (isFocusOnShow) win.show()
  else win.showInactive()
}

function attachLifecycle(
  ctx: Context,
  win: BrowserWindow,
  log: ReturnType<Context['logger']['child']>,
  opts: LifecycleOpts = {}
) {
  const isFocusOnShow = opts.isFocusOnShow ?? true
  const isAutoShow = opts.isAutoShow ?? true

  ctx.trustWebContents(win.webContents)
  attachGuards(ctx, win.webContents)

  win.once('ready-to-show', function () {
    if (!isAutoShow || win.isDestroyed()) return
    toReveal(win, isFocusOnShow)
  })

  win.webContents.on('did-finish-load', function () {
    if (!win.isDestroyed()) {
      win.webContents.send(CHANNELS.APP.MESSAGE, new Date().toLocaleString())
    }
  })

  win.webContents.on('did-fail-load', function (_event, code, desc, url) {
    log.error('did-fail-load', { code, desc, url })
    if (!isAutoShow || win.isDestroyed() || win.isVisible()) return
    toReveal(win, isFocusOnShow)
  })

  win.on('close', function () {
    if (!win.isDestroyed()) ctx.untrustWebContents(win.webContents)
  })
}

function buildWebPreferences(ctx: Context, preloadPath: string) {
  return {
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
  } as const
}

function buildPlugin(): Plugin {
  return {
    name: 'window',
    register(ctx: Context) {
      const log = ctx.logger.child('window')
      const paths = findBundlePaths()
      let overlayWindow: BrowserWindow | null = null

      if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        try {
          const origin = new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin
          ctx.toUpdateOrigins([origin])
        } catch {
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
        attachLifecycle(ctx, win, log)
        toRedirect(win, paths.route)

        win.on('closed', function () {
          if (ctx.toReadWindow() === win) ctx.toUpdateWindow(null)
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

        overlayWindow = win
        attachLifecycle(ctx, win, log, { isAutoShow: false })
        toRedirect(win, paths.route, '/overlay')

        win.on('closed', function () {
          if (overlayWindow === win) overlayWindow = null
        })

        log.info('overlay window created')
        return win
      }

      function findOverlay() {
        const win = overlayWindow
        return {
          visible: win !== null && !win.isDestroyed() && win.isVisible()
        }
      }

      function updateOverlay(visible: boolean) {
        const win = overlayWindow
        if (!win || win.isDestroyed()) throw new Error('overlay window unavailable')

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

      registerHandler(ctx, CHANNELS.OVERLAY.READ, null, findOverlay)

      registerHandler(ctx, CHANNELS.OVERLAY.UPDATE, UpdateSchema, function (input) {
        updateOverlay(input.visible)
      })

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
