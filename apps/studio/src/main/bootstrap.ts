import started from 'electron-squirrel-startup'
import path from 'node:path'
import { createAppContext } from './app-context'
import { createLogger } from './logger'
import type { StudioModule } from './module'
import { createBinModule } from './modules/bin'
import { createDatabaseModule } from './modules/database'
import { createDevtoolsModule } from './modules/devtools'
import { createDialogModule } from './modules/dialog'
import { createSecurityModule } from './modules/security'
import { createStoreModule } from './modules/store'
import { createWindowModule } from './modules/window'

export async function bootstrap(): Promise<void> {
  const log = createLogger('bootstrap')

  if (started) {
    const { app } = await import('electron')
    app.quit()
    return
  }

  const { app } = await import('electron')

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.i-thinking.studio')
  }

  process.on('uncaughtException', function (err) {
    log.error('uncaughtException', err)
  })
  process.on('unhandledRejection', function (reason) {
    log.error('unhandledRejection', reason)
  })

  await app.whenReady()

  // 打包后为 app.asar / app 目录；开发为 apps/studio
  const appPath = app.getAppPath()
  process.env.APP_ROOT = appPath
  process.env.VITE_PUBLIC = path.join(appPath, 'public')

  const ctx = createAppContext()
  const modules: StudioModule[] = [
    createSecurityModule(),
    createStoreModule(),
    createDialogModule(),
    createDatabaseModule(),
    createBinModule(),
    createDevtoolsModule(),
    createWindowModule()
  ]

  for (const mod of modules) {
    await mod.register(ctx)
    log.info(`module registered: ${mod.name}`)
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

  log.info('studio ready', { appPath, isDev: ctx.isDev })
}
