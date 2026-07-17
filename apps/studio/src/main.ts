import { app, BrowserWindow, ipcMain } from 'electron'
import started from 'electron-squirrel-startup'
import { spawn, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { registerAllIpc } from './ipc/index.js'
import { getBinPath } from './lib.js'

export { getBinPath }

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
let serviceProcess: ChildProcess | null = null

const SERVICE_PORT = import.meta.env.VITE_PORT ?? '3000'
const SERVICE_HOST = import.meta.env.VITE_HOSTNAME ?? '127.0.0.1'
const SERVICE_PROTOCOL = import.meta.env.VITE_PROTOCOL ?? 'http'

function getServiceRoot() {
  if (app.isPackaged) return process.resourcesPath
  return path.join(process.env.APP_ROOT ?? process.cwd(), '..', 'service')
}

function startNestService() {
  if (serviceProcess) return

  const serviceRoot = getServiceRoot()
  const env = {
    ...process.env,
    PORT: SERVICE_PORT,
    HOSTNAME: SERVICE_HOST,
    PROTOCOL: SERVICE_PROTOCOL
  }

  const logDir = app.getPath('logs')
  try {
    fs.mkdirSync(logDir, { recursive: true })
  } catch (error) {
    console.error('[service] mkdir logs error', error)
  }
  const logFile = path.join(logDir, 'service.log')
  const log = function (message: string) {
    try {
      fs.appendFileSync(logFile, `${new Date().toISOString()} ${message}\n`)
    } catch (error) {
      console.error('[service] log error', error)
    }
  }

  log(`serviceRoot=${serviceRoot}`)
  log(`env PORT=${SERVICE_PORT} HOST=${SERVICE_HOST} PROTOCOL=${SERVICE_PROTOCOL}`)

  if (VITE_DEV_SERVER_URL) {
    const bunCmd = process.platform === 'win32' ? 'bun' : 'bun'
    serviceProcess = spawn(bunCmd, ['run', 'dev'], {
      cwd: serviceRoot,
      env,
      stdio: 'pipe'
    })
  } else {
    const entry = path.join(serviceRoot, 'dist', 'main.js')
    log(`entry=${entry}`)
    if (!fs.existsSync(entry)) {
      console.error('[service] entry not found:', entry)
      log(`entry not found`)
      return
    }
    serviceProcess = spawn(process.execPath, ['--runAsNode', entry], {
      cwd: serviceRoot,
      env,
      stdio: 'pipe'
    })
  }

  serviceProcess.stdout?.on('data', function (data) {
    console.log('[service]', data.toString().trim())
  })
  serviceProcess.stderr?.on('data', function (data) {
    console.error('[service]', data.toString().trim())
    log(`stderr ${data.toString().trim()}`)
  })
  serviceProcess.on('error', function (error) {
    console.error('[service] error', error)
    log(`error ${String(error)}`)
  })
  serviceProcess.on('exit', function (code, signal) {
    console.log('[service] exited', { code, signal })
    log(`exit code=${String(code)} signal=${String(signal)}`)
    serviceProcess = null
  })
}

function stopNestService() {
  const proc = serviceProcess
  if (!proc || proc.killed) return
  try {
    proc.kill('SIGTERM')
    setTimeout(function () {
      if (!proc.killed) proc.kill('SIGKILL')
    }, 2000)
  } catch (error) {
    console.error('[service] stop error', error)
  }
}

function buildWindow() {
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
    backgroundMaterial: 'mica',
    // backgroundMaterial: 'acrylic',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      height: 35,
      symbolColor: '#000000'
    },
    icon: path.join(import.meta.env.VITE_PUBLIC, 'electron-vite.svg'),
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

  win.webContents.on('did-finish-load', function () {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
  })

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    win.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }

  // if (VITE_DEV_SERVER_URL) {
  //   win.loadURL(VITE_DEV_SERVER_URL)
  //   win.webContents.openDevTools({ mode: 'detach' })
  // } else {
  //   win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  // }

  win.webContents.openDevTools({ mode: 'detach' })
}

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', function () {
  if (!BrowserWindow.getAllWindows()?.length) buildWindow()
})

app.whenReady().then(function () {
  registerAllIpc({
    getWindow: function () {
      return win
    }
  })
  startNestService()
  buildWindow()

  ipcMain.handle('devtools', function (event, args) {
    console.log('event', event, '\nargs', args, '\nwin', win)
    if (!win) return
    if (args.visible) {
      win.webContents.openDevTools({ mode: 'detach' })
    } else {
      win.webContents.closeDevTools()
    }
  })
})

app.on('before-quit', function () {
  stopNestService()
})

// 主进程未捕获错误，避免静默崩溃
process.on('uncaughtException', function (err) {
  console.error('[main] uncaughtException', err)
})
process.on('unhandledRejection', function (reason, promise) {
  console.error('[main] unhandledRejection', reason, promise)
})
