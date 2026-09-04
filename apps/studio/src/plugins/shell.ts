import { BrowserView, BrowserWindow, ipcMain, session } from 'electron'
import path from 'node:path'
import { z } from 'zod'

import { CHANNELS } from './channels'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { findAppRoot, findBundleDir } from './paths'

interface OpenP {
  url: string
}

interface ChromeState {
  url: string
  canGoBack: boolean
  canGoForward: boolean
}

interface ChromeSession {
  win: BrowserWindow
  view: BrowserView
}

const OpenSchema = z.object({
  url: z.string().url()
})

/** 应用内 Chromium 持久会话：Cookie / 登录态跨窗保留 */
const PARTITION = 'persist:chrome'
const TOOLBAR = 52

const CHROME_UA = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`

const sessions = new Map<number, ChromeSession>()

function canOpenUrl(url: string) {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function findToolbarHtml() {
  const publicDir = process.env.VITE_PUBLIC || path.join(findAppRoot(), 'public')
  return path.join(publicDir, 'browser', 'shell.html')
}

function findChromePreload() {
  return path.join(findBundleDir(), 'chrome-preload.js')
}

function layoutView(win: BrowserWindow, view: BrowserView) {
  const bounds = win.getContentBounds()
  view.setBounds({
    x: 0,
    y: TOOLBAR,
    width: bounds.width,
    height: Math.max(0, bounds.height - TOOLBAR)
  })
}

function pushState(entry: ChromeSession) {
  if (entry.win.isDestroyed()) return
  const contents = entry.view.webContents
  const state: ChromeState = {
    url: contents.getURL(),
    canGoBack: contents.navigationHistory.canGoBack(),
    canGoForward: contents.navigationHistory.canGoForward()
  }
  entry.win.webContents.send('chrome:state', state)
  entry.win.setTitle(contents.getTitle() || 'Browser')
}

function bindView(entry: ChromeSession) {
  const { win, view } = entry
  const contents = view.webContents

  contents.setUserAgent(CHROME_UA)

  contents.on('page-title-updated', function (_event, title) {
    if (!win.isDestroyed()) win.setTitle(title || 'Browser')
  })

  contents.on('did-navigate', function () {
    pushState(entry)
  })
  contents.on('did-navigate-in-page', function () {
    pushState(entry)
  })
  contents.on('did-finish-load', function () {
    pushState(entry)
  })

  contents.setWindowOpenHandler(function ({ url }) {
    if (canOpenUrl(url)) openChrome(url)
    return { action: 'deny' }
  })
}

/**
 * Electron 自带 Chromium 浏览器窗：地址栏 + 前进后退刷新 + 持久登录会话。
 * 说明：Chrome 网上应用店扩展无法在 Electron 完整还原（无扩展商店 / Profile 同步）。
 */
function openChrome(url: string) {
  if (!canOpenUrl(url)) {
    throw new Error(`blocked url: ${url}`)
  }

  const chromeSession = session.fromPartition(PARTITION)

  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 640,
    minHeight: 480,
    show: false,
    autoHideMenuBar: true,
    title: 'Browser',
    backgroundColor: '#f1f3f4',
    webPreferences: {
      preload: findChromePreload(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  const view = new BrowserView({
    webPreferences: {
      session: chromeSession,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  win.setBrowserView(view)
  layoutView(win, view)

  const entry: ChromeSession = { win, view }
  sessions.set(win.id, entry)
  bindView(entry)

  win.on('resize', function () {
    if (!win.isDestroyed()) layoutView(win, view)
  })

  win.once('ready-to-show', function () {
    if (!win.isDestroyed()) win.show()
  })

  win.on('closed', function () {
    sessions.delete(win.id)
  })

  win.webContents.on('did-finish-load', function () {
    pushState(entry)
  })

  void win.loadFile(findToolbarHtml())
  void view.webContents.loadURL(url)

  return win
}

function findSession(event: Electron.IpcMainEvent) {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return null
  return sessions.get(win.id) ?? null
}

function buildPlugin(): Plugin {
  return {
    name: 'shell',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.SHELL.OPEN, OpenSchema, function (input) {
        openChrome(input.url)
      })

      ipcMain.on('chrome:back', function (event) {
        const entry = findSession(event)
        if (!entry || entry.view.webContents.navigationHistory.canGoBack() === false) return
        entry.view.webContents.navigationHistory.goBack()
      })

      ipcMain.on('chrome:forward', function (event) {
        const entry = findSession(event)
        if (!entry || entry.view.webContents.navigationHistory.canGoForward() === false) return
        entry.view.webContents.navigationHistory.goForward()
      })

      ipcMain.on('chrome:reload', function (event) {
        const entry = findSession(event)
        if (!entry) return
        entry.view.webContents.reload()
      })

      ipcMain.on('chrome:navigate', function (event, raw: unknown) {
        const entry = findSession(event)
        if (!entry || typeof raw !== 'string' || !canOpenUrl(raw)) return
        void entry.view.webContents.loadURL(raw)
      })

      ctx.logger.child('shell').info('registered')
    }
  }
}

export { buildPlugin, canOpenUrl, openChrome, OpenSchema }
export type { OpenP }
