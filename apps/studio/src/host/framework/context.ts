import { app, ipcMain, type IpcMain, type WebContents } from 'electron'

import { buildLogger, type Logger } from './logger'

/**
 * 框架级服务：日志、IPC 总线、可信渲染进程与页面 origin 登记。
 *
 * **窗口引用不在这里**。谁建窗口谁持有引用（capabilities 的端口），
 * 需要主窗口的功能从端口取 —— 否则 ctx 与插件各存一份，两份就会对不上。
 *
 * **能力域宿主也不在这里**（corex 等）。framework 是被能力域引用的那一层，
 * 不能反向依赖它们；宿主由组合根（`main.ts`）建好后直接交给用它的能力域与 handler。
 */
interface Context {
  app: typeof app
  ipc: IpcMain
  isDev: boolean
  logger: Logger
  /** 登记可信渲染进程（IPC / 导航校验用） */
  trustWebContents: (contents: WebContents) => void
  untrustWebContents: (contents: WebContents) => void
  isTrustedWebContents: (contents: WebContents) => boolean
  /** 开发态允许的页面 origin（如 Vite）；生产为空则仅 file: */
  toReadOrigins: () => readonly string[]
  toUpdateOrigins: (origins: readonly string[]) => void
}

function buildContext(): Context {
  const trustedIds = new Set<number>()
  let allowedOrigins: readonly string[] = []
  const isDev = !app.isPackaged
  const logger = buildLogger('main')

  return {
    app,
    ipc: ipcMain,
    isDev,
    logger,
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
