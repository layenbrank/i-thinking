import { type IpcMain } from 'electron'

import { type InvokeChannel } from '../../shared/ipc/channels'
import { type OverlayWindowPort } from '../capabilities/overlay-window'
import { type MainWindowPort } from '../capabilities/window'
import { type WindowPorts } from '../capabilities/window-registry'
import { type Context } from '../framework/context'
import { buildAssistantHandlers } from './handlers/assistant'
import { buildChatHandlers } from './handlers/chat'
import { buildDevtoolsHandlers } from './handlers/devtools'
import { buildDialogHandlers } from './handlers/dialog'
import { buildDocHandlers } from './handlers/doc'
import { buildMirrorHandlers } from './handlers/mirror'
import { buildOverlayHandlers } from './handlers/overlay'
import { buildScreenshotHandlers } from './handlers/screenshot'
import { buildSidecarHandlers } from './handlers/sidecar'
import { buildStoreHandlers } from './handlers/store'
import { buildUpdaterHandlers } from './handlers/updater'
import { buildUserHandlers } from './handlers/user'
import { buildWindowHandlers } from './handlers/window'
import { buildWorkspaceHandlers } from './handlers/workspace'
import { registerAll, type IpcDisposable } from './register'
import { type Handlers } from './types'

export interface IpcDeps {
  ctx: Context
  /** 与 window 插件共用的 overlay 窗口端口 */
  overlay: OverlayWindowPort
  /** 按需创建的子窗口端口（注册表按窗口键分发，不归 window 插件管） */
  windows: WindowPorts
  /** 主窗口端口：对话框 parent 与更新事件推送的宿主 */
  mainWindow: MainWindowPort
}

type AssertNever<T extends never> = T

/**
 * 装配全部 handler 切片。
 *
 * 两道守卫：
 * 1. `satisfies Handlers` —— 在装配点给出精确的「哪个频道缺失/多余/返回类型不对」
 * 2. `_Total` —— 独立于对象展开的类型推断；即使 TS 把 spread 推宽成可选也能捕获
 *
 * handler 是闭包（各自持有 service），所以装配本身没有副作用；
 * 真正注册由 `registerStudioIpc` 完成。
 */
export function buildHandlers(deps: IpcDeps) {
  const handlers = {
    ...buildStoreHandlers(),
    ...buildDevtoolsHandlers(deps.ctx),
    ...buildDialogHandlers(deps.mainWindow),
    ...buildDocHandlers(),
    ...buildUserHandlers(),
    ...buildSidecarHandlers(deps.ctx),
    ...buildScreenshotHandlers(deps.ctx),
    ...buildOverlayHandlers(deps.overlay),
    ...buildMirrorHandlers(),
    ...buildWindowHandlers(deps.windows),
    ...buildWorkspaceHandlers(),
    ...buildChatHandlers(),
    ...buildAssistantHandlers(deps.ctx),
    ...buildUpdaterHandlers(deps.ctx, deps.mainWindow)
  } satisfies Handlers

  type _Total = AssertNever<Exclude<InvokeChannel, keyof typeof handlers>>
  void 0 as unknown as _Total

  return handlers
}

/** 组合根调用：装配 → 注册 → 返回可拆除句柄 */
export function registerStudioIpc(ipc: IpcMain, deps: IpcDeps): IpcDisposable {
  return registerAll(ipc, deps.ctx, buildHandlers(deps))
}

export type { IpcDisposable }
