import { type IpcMain } from 'electron'

import type { Service as CaptureService } from '@/host/capabilities/capture'
import type { ThroughHost } from '@/host/capabilities/overlay/through'
import { type OverlayWindowPort } from '@/host/capabilities/overlay/window-port'
import type { CorexHost } from '@/host/capabilities/sidecar'
import { type MainWindowPort } from '@/host/capabilities/window'
import { type WindowPorts } from '@/host/capabilities/window/registry'
import { type Context } from '@/host/framework/context'
import { buildAssetHandlers } from '@/host/ipc/handlers/asset'
import { buildAssistantHandlers } from '@/host/ipc/handlers/assistant'
import { buildCaptureHandlers } from '@/host/ipc/handlers/capture'
import { buildChatHandlers } from '@/host/ipc/handlers/chat'
import { buildDevtoolsHandlers } from '@/host/ipc/handlers/devtools'
import { buildDialogHandlers } from '@/host/ipc/handlers/dialog'
import { buildDocHandlers } from '@/host/ipc/handlers/doc'
import { buildMirrorHandlers } from '@/host/ipc/handlers/mirror'
import { buildOverlayHandlers } from '@/host/ipc/handlers/overlay'
import { buildSidecarHandlers } from '@/host/ipc/handlers/sidecar'
import { buildStoreHandlers } from '@/host/ipc/handlers/store'
import { buildThroughHandlers } from '@/host/ipc/handlers/through'
import { buildToolHandlers } from '@/host/ipc/handlers/tools'
import { buildUpdaterHandlers } from '@/host/ipc/handlers/updater'
import { buildUserHandlers } from '@/host/ipc/handlers/user'
import { buildWindowHandlers } from '@/host/ipc/handlers/window'
import { buildWorkspaceHandlers } from '@/host/ipc/handlers/workspace'
import { type InvokeChannel } from '@/shared/ipc/channels'
import { registerAll, type IpcDisposable } from './register'
import { type Handlers } from './types'

export interface IpcDeps {
  ctx: Context
  /** sidecar 宿主：只有 sidecar / capture 两条频道线用它，不挂在 ctx 上 */
  sidecar: CorexHost
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
    ...buildToolHandlers(),
    ...buildUserHandlers(),
    ...buildSidecarHandlers(deps.sidecar),
    ...buildCaptureHandlers(deps.sidecar, deps.overlay, deps.through, deps.captureService),
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
