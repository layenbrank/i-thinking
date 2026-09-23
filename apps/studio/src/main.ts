import { app } from 'electron'
import started from 'electron-squirrel-startup'
import path from 'node:path'

import type { BrowserWindow } from 'electron'

import { buildPlugin as buildDatabasePlugin } from './host/capabilities/database'
import { buildOverlayWindowPort } from './host/capabilities/overlay-window'
import { buildPlugin as buildSecurityPlugin } from './host/capabilities/security'
import { buildPlugin as buildSidecarPlugin, CorexHost } from './host/capabilities/sidecar'
import { buildPlugin as buildTrayPlugin } from './host/capabilities/tray'
import { buildPlugin as buildWindowPlugin } from './host/capabilities/window'
import { buildWindowPorts } from './host/capabilities/window-registry'
import { buildContext } from './host/framework/context'
import { buildLogger } from './host/framework/logger'
import type { Plugin } from './host/framework/module'
import { registerStudioIpc } from './host/ipc'
import {
  acquireSingleInstanceLock,
  attachSecondInstanceFocus
} from './host/lifecycle/single-instance'

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

  // 窗口端口在组合根一次建好，再分发给三个消费者：IPC 分派、托盘、二次启动聚焦。
  // 端口构造无副作用（真正建窗在插件 register 里），所以能先于插件循环创建。
  const overlayPort = buildOverlayWindowPort(ctx)
  const windows = buildWindowPorts(ctx)
  const windowPlugin = buildWindowPlugin(overlayPort)

  findWindow = windowPlugin.mainWindow.toRead

  // IPC **必须先于插件循环注册**：window 插件会 loadURL，渲染进程随即 invoke；
  // 注册晚一拍会让首个 store:toRead 失败，而 /agent 在 loaded=false 时永远渲染 null（白屏）。
  const ipc = registerStudioIpc(ctx.ipc, {
    ctx,
    overlay: overlayPort,
    windows,
    mainWindow: windowPlugin.mainWindow
  })

  // 插件只负责生命周期（安全会话 / 关库 / 建窗 / 起 sidecar）；
  // 频道注册已由 IPC 装配层遍历契约完成
  const plugins: Plugin[] = [
    buildSecurityPlugin(),
    buildDatabasePlugin(),
    windowPlugin,
    buildSidecarPlugin(),
    // 托盘放在最后：它要用主窗口端口把窗口叫回来
    buildTrayPlugin({ mainWindow: windowPlugin.mainWindow, agentWindow: windows.agent })
  ]

  try {
    for (const plugin of plugins) {
      await plugin.register(ctx)
      log.info(`plugin registered: ${plugin.name}`)
    }
  } catch (error) {
    log.error('plugin registration failed', error)
    if (!windowPlugin.mainWindow.toRead()) return app.exit(1)
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

      // 拆除全部 owned 频道（LIFO，只拆自己注册的）
      try {
        ipc.dispose()
      } catch (error) {
        log.error('ipc dispose failed', error)
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
