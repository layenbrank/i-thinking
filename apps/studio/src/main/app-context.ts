import {
  app,
  ipcMain,
  type BrowserWindow,
  type IpcMain,
  type WebContents
} from 'electron'
import { buildLogger, type Logger } from './logger'
import { CorexHost } from './modules/sidecar/corex-host'
import { Service as SidecarService } from './modules/sidecar/service'

type AppContext = {
  app: typeof app
  ipc: IpcMain
  isDev: boolean
  logger: Logger
  sidecars: SidecarService
  corex: CorexHost
  findWindow: () => BrowserWindow | null
  setWindow: (win: BrowserWindow | null) => void
  /** 登记可信渲染进程（IPC / 导航校验用） */
  trustWebContents: (contents: WebContents) => void
  untrustWebContents: (contents: WebContents) => void
  isTrustedWebContents: (contents: WebContents) => boolean
  /** 开发态允许的页面 origin（如 Vite）；生产为空则仅 file: */
  findAllowedOrigins: () => readonly string[]
  setAllowedOrigins: (origins: readonly string[]) => void
}

function buildAppContext(): AppContext {
  let mainWindow: BrowserWindow | null = null
  const trustedIds = new Set<number>()
  let allowedOrigins: readonly string[] = []
  const isDev = !app.isPackaged
  const logger = buildLogger('main')
  const sidecars = new SidecarService()
  const corex = new CorexHost(sidecars, logger)

  return {
    app,
    ipc: ipcMain,
    isDev,
    logger,
    sidecars,
    corex,
    findWindow() {
      return mainWindow
    },
    setWindow(win) {
      mainWindow = win
    },
    trustWebContents(contents) {
      trustedIds.add(contents.id)
    },
    untrustWebContents(contents) {
      trustedIds.delete(contents.id)
    },
    isTrustedWebContents(contents) {
      return trustedIds.has(contents.id)
    },
    findAllowedOrigins() {
      return allowedOrigins
    },
    setAllowedOrigins(origins) {
      allowedOrigins = origins
    }
  }
}

export type { AppContext }
export { buildAppContext }
