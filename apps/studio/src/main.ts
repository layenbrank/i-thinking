import { app } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'node:path'

import type { BrowserWindow } from 'electron'

import { buildContext } from './host/framework/context'
import { buildLogger } from './host/framework/logger'
import type { Plugin } from './host/framework/module'
import { buildPlugin as buildDatabasePlugin } from './host/capabilities/database'
import { buildPlugin as buildChatPlugin } from './host/capabilities/chat'
import { buildPlugin as buildAssistantPlugin } from './host/capabilities/assistant'
import { buildPlugin as buildDevtoolsPlugin } from './host/capabilities/devtools'
import { buildPlugin as buildDialogPlugin } from './host/capabilities/dialog'
import { buildPlugin as buildDocPlugin } from './host/capabilities/doc'
import { buildPlugin as buildScreenshotPlugin } from './host/capabilities/screenshot'
import { buildPlugin as buildSecurityPlugin } from './host/capabilities/security'
import { buildPlugin as buildSidecarPlugin, CorexHost } from './host/capabilities/sidecar'
import { buildPlugin as buildStorePlugin } from './host/capabilities/store'
import { buildPlugin as buildUpdaterPlugin } from './host/capabilities/updater'
import { buildPlugin as buildWindowPlugin } from './host/capabilities/window'
import { buildOverlayWindowPort } from './host/capabilities/overlay-window'
import { acquireSingleInstanceLock, attachSecondInstanceFocus } from './host/lifecycle/single-instance'

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

  // overlay 窗口的读写端口：window 插件负责 attach 窗口，overlay 频道从中读写
  const overlayPort = buildOverlayWindowPort()

  // 先建窗与本地 IPC；sidecar 后台启动，不阻塞后续模块
  const plugins: Plugin[] = [
    buildSecurityPlugin(),
    buildStorePlugin(),
    buildDialogPlugin(),
    buildDatabasePlugin(),
    buildChatPlugin(),
    buildAssistantPlugin(),
    buildWindowPlugin(overlayPort),
    buildDevtoolsPlugin(),
    buildUpdaterPlugin(),
    buildDocPlugin(),
    buildScreenshotPlugin(),
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

    void disposePlugins()
  })

  log.info('studio ready', {
    appPath,
    isDev: ctx.isDev
  })
}

void bootstrap()
