import { app, ipcMain, type BrowserWindow, type IpcMain, type WebContents } from 'electron'

import { buildLogger, type Logger } from './logger'
import type { CorexHost } from './sidecar'

interface Context {
  app: typeof app
  ipc: IpcMain
  isDev: boolean
  logger: Logger
  corex: CorexHost
  toReadWindow: () => BrowserWindow | null
  toUpdateWindow: (win: BrowserWindow | null) => void
  /** 登记可信渲染进程（IPC / 导航校验用） */
  trustWebContents: (contents: WebContents) => void
  untrustWebContents: (contents: WebContents) => void
  isTrustedWebContents: (contents: WebContents) => boolean
  /** 开发态允许的页面 origin（如 Vite）；生产为空则仅 file: */
  toReadOrigins: () => readonly string[]
  toUpdateOrigins: (origins: readonly string[]) => void
}

function buildContext(corex: CorexHost): Context {
  let window: BrowserWindow | null = null
  const trustedIds = new Set<number>()
  let allowedOrigins: readonly string[] = []
  const isDev = !app.isPackaged
  const logger = buildLogger('main')

  return {
    app,
    ipc: ipcMain,
    isDev,
    logger,
    corex,
    toReadWindow() {
      return window
    },
    toUpdateWindow(win) {
      window = win
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
    toReadOrigins() {
      return allowedOrigins
    },
    toUpdateOrigins(origins) {
      allowedOrigins = origins
    }
  }
}

export { buildContext }
export type { Context }
