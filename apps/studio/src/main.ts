import { app } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'node:path'

import type { BrowserWindow } from 'electron'

import { buildContext } from './plugins/context'
import { buildLogger } from './plugins/logger'
import type { Plugin } from './plugins/module'
import { buildPlugin as buildDatabasePlugin } from './plugins/database'
import { buildPlugin as buildDevtoolsPlugin } from './plugins/devtools'
import { buildPlugin as buildDialogPlugin } from './plugins/dialog'
import { buildPlugin as buildDocPlugin } from './plugins/doc'
import { buildPlugin as buildScreenshotPlugin } from './plugins/screenshot'
import { buildPlugin as buildSecurityPlugin } from './plugins/security'
import { buildPlugin as buildShellPlugin } from './plugins/shell'
import { buildPlugin as buildSidecarPlugin, CorexHost } from './plugins/sidecar'
import { buildPlugin as buildStorePlugin } from './plugins/store'
import { buildPlugin as buildUpdaterPlugin } from './plugins/updater'
import { buildPlugin as buildWindowPlugin } from './plugins/window'
import { acquireSingleInstanceLock, attachSecondInstanceFocus } from './plugins/single-instance'

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
  let findWindow: () => BrowserWindow | null = function () {
    return null
  }

  attachSecondInstanceFocus(app, findWindow)

  await app.whenReady()

  // 打包后为 app.asar / app 目录；开发为 apps/studio
  const appPath = app.getAppPath()
  process.env.APP_ROOT = appPath
  process.env.VITE_PUBLIC = path.join(appPath, 'public')

  const ctx = buildContext(new CorexHost(buildLogger('main')))

  findWindow = ctx.toReadWindow

  // 先建窗与本地 IPC；sidecar 后台启动，不阻塞后续模块
  const plugins: Plugin[] = [
    buildSecurityPlugin(),
    buildStorePlugin(),
    buildDialogPlugin(),
    buildDatabasePlugin(),
    buildWindowPlugin(),
    buildDevtoolsPlugin(),
    buildUpdaterPlugin(),
    buildDocPlugin(),
    buildScreenshotPlugin(),
    buildShellPlugin(),
    buildSidecarPlugin()
  ]

  try {
    for (const plugin of plugins) {
      await plugin.register(ctx)
      log.info(`plugin registered: ${plugin.name}`)
    }
  } catch (error) {
    log.error('plugin registration failed', error)
    if (!ctx.toReadWindow()) return app.exit(1)
  }

  let isDisposing = false
  app.on('before-quit', function (event) {
    if (isDisposing) return
    event.preventDefault()
    isDisposing = true

    async function disposePlugins() {
      for (const plugin of [...plugins].reverse()) {
        if (!plugin.dispose) continue
        try {
          await plugin.dispose()
        } catch (error) {
          log.error(`dispose failed: ${plugin.name}`, error)
        }
      }
      app.exit(0)
    }

    disposePlugins()
  })

  log.info('studio ready', {
    appPath,
    isDev: ctx.isDev
  })
}

void bootstrap()
