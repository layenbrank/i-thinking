import started from 'electron-squirrel-startup'
import path from 'node:path'
import type { BrowserWindow } from 'electron'
import { buildAppContext } from './app-context'
import { buildLogger } from './logger'
import type { StudioModule } from './module'
import { buildModule as buildSidecarModule } from './modules/sidecar'
import { buildModule as buildScreenshotModule } from './modules/screenshot'
import { buildModule as buildDocModule } from './modules/doc'
import { buildModule as buildDatabaseModule } from './modules/database'
import { buildModule as buildDevtoolsModule } from './modules/devtools'
import { buildModule as buildDialogModule } from './modules/dialog'
import { buildModule as buildSecurityModule } from './modules/security'
import { buildModule as buildStoreModule } from './modules/store'
import { buildModule as buildUpdaterModule } from './modules/updater'
import { buildModule as buildWindowModule } from './modules/window'
import {
  acquireSingleInstanceLock,
  attachSecondInstanceFocus
} from './single-instance'

export async function bootstrap(): Promise<void> {
  const log = buildLogger('bootstrap')

  if (started) {
    const { app } = await import('electron')
    app.quit()
    return
  }

  const { app } = await import('electron')

  if (!acquireSingleInstanceLock(app)) {
    log.info('another instance holds the lock; quitting')
    app.quit()
    return
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.i-thinking.studio')
  }

  process.on('uncaughtException', function (err) {
    log.error('uncaughtException', err)
  })
  process.on('unhandledRejection', function (reason) {
    log.error('unhandledRejection', reason)
  })

  // findWindow 在 ctx 建好后绑定；二次启动可能早于建窗，focus 为 no-op
  let findWindow: () => BrowserWindow | null = function () {
    return null
  }
  attachSecondInstanceFocus(app, function () {
    return findWindow()
  })

  await app.whenReady()

  // 打包后为 app.asar / app 目录；开发为 apps/studio
  const appPath = app.getAppPath()
  process.env.APP_ROOT = appPath
  process.env.VITE_PUBLIC = path.join(appPath, 'public')

  const ctx = buildAppContext()
  findWindow = function () {
    return ctx.findWindow()
  }

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
    if (!ctx.findWindow()) {
      app.exit(1)
      return
    }
  }

  let isDisposing = false
  app.on('before-quit', function (event) {
    if (isDisposing) return
    event.preventDefault()
    isDisposing = true

    void (async function () {
      for (const mod of [...modules].reverse()) {
        if (!mod.dispose) continue
        try {
          await mod.dispose()
        } catch (error) {
          log.error(`dispose failed: ${mod.name}`, error)
        }
      }
      app.exit(0)
    })()
  })

  log.info('studio ready', {
    appPath,
    isDev: ctx.isDev
  })
}
