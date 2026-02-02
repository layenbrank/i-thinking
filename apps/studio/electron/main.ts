import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// import { createRequire } from 'node:module'
// const require = createRequire(import.meta.url)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

let win: BrowserWindow | null

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
      nodeIntegration: true,
      preload: path.join(__dirname, 'preload.mjs')
    }
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', function () {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({
      mode: 'detach'
    })
  }
  // win.loadFile('dist/index.html')
  else win.loadFile(path.join(RENDERER_DIST, 'index.html'))
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (!BrowserWindow.getAllWindows()?.length) createWindow()
})

app.whenReady().then(createWindow)
