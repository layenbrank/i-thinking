import {
  app,
  ipcMain,
  type BrowserWindow,
  type IpcMain,
  type WebContents
} from 'electron'
import { createLogger, type Logger } from './logger'

export interface AppContext {
  app: typeof app
  ipc: IpcMain
  isDev: boolean
  logger: Logger
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

export function createAppContext(): AppContext {
  let mainWindow: BrowserWindow | null = null
  const trustedIds = new Set<number>()
  let allowedOrigins: readonly string[] = []
  const isDev = !app.isPackaged

  return {
    app,
    ipc: ipcMain,
    isDev,
    logger: createLogger('main'),
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
