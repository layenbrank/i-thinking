import { app, BrowserWindow } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerAllIpc } from './bin/ipc/index.js'

if (started) app.quit()

// Windows 任务栏/通知等需要固定 App User Model ID
if (process.platform === 'win32') app.setAppUserModelId('com.i-thinking.studio')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
// 主进程打包到 .vite/build/main.js，项目根目录需再上一级（generated、public 等所在目录）
process.env.APP_ROOT = path.join(__dirname, '..', '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null = null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    fullscreen: false,
    minimizable: true,
    maximizable: true,
    resizable: true,
    transparent: false,
    center: true,
    backgroundColor: '#00000000',
    title: 'i thinking',
    frame: true,
    titleBarStyle: 'customButtonsOnHover',
    titleBarOverlay: true,
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      minimumFontSize: 12,
      defaultFontSize: 16,
      plugins: true,
      spellcheck: true,
      defaultEncoding: 'utf-8',
      webgl: true,
      devTools: true,
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js')
    }
  })

  win?.setMenu(null)

  win.webContents.on('did-finish-load', function () {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    )
  }

  win.webContents.openDevTools({ mode: 'detach' })

  // if (VITE_DEV_SERVER_URL) {
  //   win.loadURL(VITE_DEV_SERVER_URL)
  //   win.webContents.openDevTools({ mode: 'detach' })
  // } else {
  //   win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  // }
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', function () {
  if (!BrowserWindow.getAllWindows()?.length) createWindow()
})

app.whenReady().then(function () {
  registerAllIpc({
    getWindow: function () {
      return win
    }
  })
  createWindow()
})

// 主进程未捕获错误，避免静默崩溃
process.on('uncaughtException', function (err) {
  console.error('[main] uncaughtException', err)
})
process.on('unhandledRejection', function (reason, promise) {
  console.error('[main] unhandledRejection', reason, promise)
})
