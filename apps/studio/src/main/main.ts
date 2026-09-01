import { app } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'node:path'

import type { BrowserWindow } from 'electron'

import { buildContext } from './context'
import { buildLogger } from './logger'
import type { StudioModule } from './module'
import { buildModule as buildDatabaseModule } from './modules/database'
import { buildModule as buildDevtoolsModule } from './modules/devtools'
import { buildModule as buildDialogModule } from './modules/dialog'
import { buildModule as buildDocModule } from './modules/doc'
import { buildModule as buildScreenshotModule } from './modules/screenshot'
import { buildModule as buildSecurityModule } from './modules/security'
import { buildModule as buildSidecarModule } from './modules/sidecar'
import { buildModule as buildStoreModule } from './modules/store'
import { buildModule as buildUpdaterModule } from './modules/updater'
import { buildModule as buildWindowModule } from './modules/window'
import { acquireSingleInstanceLock, attachSecondInstanceFocus } from './single-instance'

export async function bootstrap(): Promise<void> {
  const log = buildLogger('bootstrap')

  if (started) return app.quit()

  if (!acquireSingleInstanceLock(app)) {
    log.info('another instance holds the lock; quitting')

    return app.quit()
  }

  if (process.platform === 'win32') app.setAppUserModelId('com.i-thinking.studio')

  process.on('uncaughtException', function (err) {
    log.error('uncaughtException', err)
  })
  process.on('unhandledRejection', function (reason) {
    log.error('unhandledRejection', reason)
  })

  // findWindow 在 ctx 建好后绑定；二次启动可能早于建窗，focus 为 no-op
  let findWindow: () => BrowserWindow | null = () => null

  attachSecondInstanceFocus(app, findWindow)

  await app.whenReady()

  // 打包后为 app.asar / app 目录；开发为 apps/studio
  const appPath = app.getAppPath()
  process.env.APP_ROOT = appPath
  process.env.VITE_PUBLIC = path.join(appPath, 'public')

  const ctx = buildContext()

  findWindow = ctx.toReadWindow

  // 先建窗与本地 IPC；sidecar 后台启动，不阻塞后续模块
  const modules: StudioModule[] = [
    buildSecurityModule(),
    buildStoreModule(),
    buildDialogModule(),
    buildDatabaseModule(),
    buildWindowModule(),
    buildDevtoolsModule(),
    buildUpdaterModule(),
    buildDocModule(),
    buildScreenshotModule(),
    buildSidecarModule()
  ]

  try {
    for (const mod of modules) {
      await mod.register(ctx)
      log.info(`module registered: ${mod.name}`)
    }
  } catch (error) {
    log.error('module registration failed', error)
    if (!ctx.toReadWindow()) return app.exit(1)
  }

  let isDisposing = false
  app.on('before-quit', function (event) {
    if (isDisposing) return
    event.preventDefault()
    isDisposing = true

    async function disposeModules() {
      for (const mod of [...modules].reverse()) {
        if (!mod.dispose) continue
        try {
          await mod.dispose()
        } catch (error) {
          log.error(`dispose failed: ${mod.name}`, error)
        }
      }
      app.exit(0)
    }

    disposeModules()
  })

  log.info('studio ready', {
    appPath,
    isDev: ctx.isDev
  })
}

void bootstrap()
