import { existsSync } from 'node:fs'
import path from 'node:path'

import { app, type BrowserWindow } from 'electron'

import type { Context } from '../framework/context'
import { findBundleDir } from '../framework/paths'
import { attachGuards } from './security'

/**
 * 建窗的公共原语：路径解析、加载、安全附着、共用窗口选项。
 *
 * 主窗口（`window.ts`）与按需子窗口（`window-registry.ts`）用的都是这些 ——
 * 各窗口的选项各异，但「怎么加载、怎么验、怎么显示」只有一份。
 */

/**
 * 隐藏原生标题栏后由系统绘制的窗口按钮区。
 *
 * 主窗口与子窗口必须完全一致，否则切换焦点时按钮会跳位；各写一遍必然漏改。
 */
const TITLE_BAR_OVERLAY = {
  color: '#00000000',
  height: 35,
  symbolColor: '#000000'
} as const

interface BundlePaths {
  route: string
  preloadPath: string
  iconPath?: string
}

interface LifecycleOpts {
  isFocusOnShow?: boolean
  isAutoShow?: boolean
}

/**
 * 应用图标（窗口图标与托盘图标**共用同一个文件**）。
 *
 * 不能用 `public/`：它不在 `forge/packager.ts` 的 keep 白名单里，打包后那个目录根本不存在 ——
 * 开发期看着正常，装完就静默消失（托盘会变成一个没图标的空壳）。
 * 所以图标走 `extraResource` 落在 `process.resourcesPath`，这里按「是否打包」分别解析。
 */
function findAppIconPath(): string | undefined {
  const file = process.platform === 'win32' ? 'icon.ico' : 'icon.png'
  const root = app.isPackaged ? process.resourcesPath : (process.env.VITE_PUBLIC ?? '')
  if (!root) return undefined

  const candidate = path.join(root, file)
  return existsSync(candidate) ? candidate : undefined
}

function findBundlePaths(): BundlePaths {
  const bundleDir = findBundleDir()
  const iconPath = findAppIconPath()

  return {
    route: path.join(bundleDir, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    preloadPath: path.join(bundleDir, 'preload.js'),
    ...(iconPath ? { iconPath } : {})
  }
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

  win.webContents.on('did-fail-load', function (_event, code, desc, url) {
    log.error('did-fail-load', { code, desc, url })
    if (!isAutoShow || win.isDestroyed() || win.isVisible()) return
    toReveal(win, isFocusOnShow)
  })

  win.on('close', function (event) {
    // 被 preventDefault 的 close（例如主窗口「收进托盘」）窗口并没死，
    // 此时撤掉信任会让它之后再也发不出 IPC —— 只有真关掉才撤
    if (event.defaultPrevented) return
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

export {
  attachLifecycle,
  buildWebPreferences,
  findAppIconPath,
  findBundlePaths,
  toRedirect,
  TITLE_BAR_OVERLAY
}
export type { BundlePaths, LifecycleOpts }
