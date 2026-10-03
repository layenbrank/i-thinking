import { type IpcMain } from 'electron'

import { type InvokeChannel } from '../../shared/ipc/channels'
import type { Service as CaptureService } from '../capabilities/capture'
import { type OverlayWindowPort } from '../capabilities/overlay-window'
import { type MainWindowPort } from '../capabilities/window'
import { type WindowPorts } from '../capabilities/window-registry'
import type { ThroughHost } from '../capabilities/through'
import { type Context } from '../framework/context'
import { buildAssistantHandlers } from './handlers/assistant'
import { buildAssetHandlers } from './handlers/asset'
import { buildCaptureHandlers } from './handlers/capture'
import { buildChatHandlers } from './handlers/chat'
import { buildDevtoolsHandlers } from './handlers/devtools'
import { buildDialogHandlers } from './handlers/dialog'
import { buildDocHandlers } from './handlers/doc'
import { buildMirrorHandlers } from './handlers/mirror'
import { buildOverlayHandlers } from './handlers/overlay'
import { buildSidecarHandlers } from './handlers/sidecar'
import { buildStoreHandlers } from './handlers/store'
import { buildThroughHandlers } from './handlers/through'
import { buildUpdaterHandlers } from './handlers/updater'
import { buildUserHandlers } from './handlers/user'
import { buildWindowHandlers } from './handlers/window'
import { buildWorkspaceHandlers } from './handlers/workspace'
import { registerAll, type IpcDisposable } from './register'
import { type Handlers } from './types'

export interface IpcDeps {
  ctx: Context
  overlay: OverlayWindowPort
  windows: WindowPorts
  mainWindow: MainWindowPort
  through: ThroughHost
  captureService: { current: CaptureService | null }
}

type AssertNever<T extends never> = T

export function buildHandlers(deps: IpcDeps) {
  const handlers = {
    ...buildStoreHandlers(),
    ...buildDevtoolsHandlers(deps.ctx),
    ...buildDialogHandlers(deps.mainWindow),
    ...buildDocHandlers(),
    ...buildUserHandlers(),
    ...buildSidecarHandlers(deps.ctx),
    ...buildCaptureHandlers(deps.ctx, deps.overlay, deps.through, deps.captureService),
    ...buildAssetHandlers(),
    ...buildThroughHandlers(deps.through),
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

export function registerStudioIpc(ipc: IpcMain, deps: IpcDeps): IpcDisposable {
  return registerAll(ipc, deps.ctx, buildHandlers(deps))
}

export type { IpcDisposable }
