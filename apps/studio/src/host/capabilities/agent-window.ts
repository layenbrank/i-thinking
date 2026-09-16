import { BrowserWindow } from 'electron'

import type { Context } from '../framework/context'
import { attachLifecycle, buildWebPreferences, findBundlePaths, toRedirect } from './window-factory'

/**
 * Agent 子窗口的端口。
 *
 * 窗口是**按需创建**的（主窗口点「打开 Agent 窗口」才建），因此它不属于 window
 * 插件的启动期建窗清单；创建与聚焦由本端口独占持有，`window:agent.toOpen`
 * 频道的 handler 只调用它 —— 生命周期与频道实现各归其位。
 *
 * 它**不是主窗口的子窗口**（刻意不传 `parent`）：Windows 上子窗口会跟着父窗口一起最小化，
 * 而且没有自己的任务栏按钮 —— 而「主窗口收起来、Agent 窗口继续干活」正是这个窗口的用法。
 * 代价是它不再恒在主窗口之上；要把它调出来用任务栏或托盘。
 */
interface AgentWindowPort {
  /** 已开则聚焦（顺带从最小化恢复），未开则创建 */
  toOpen(): void
}

function buildAgentWindow(ctx: Context): BrowserWindow {
  const paths = findBundlePaths()

  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 640,
    minHeight: 480,
    show: false,
    center: true,
    title: 'i thinking · Agent',
    frame: true,
    backgroundMaterial: 'mica',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#00000000',
      height: 35,
      symbolColor: '#000000'
    },
    icon: paths.iconPath,
    webPreferences: buildWebPreferences(ctx, paths.preloadPath)
  })

  const log = ctx.logger.child('window').child('agent')
  attachLifecycle(ctx, win, log)
  toRedirect(win, paths.route, '/agent/chat')

  log.info('agent window created')
  return win
}

function buildAgentWindowPort(ctx: Context): AgentWindowPort {
  let agentWindow: BrowserWindow | null = null

  return {
    toOpen() {
      const existing = agentWindow
      if (existing && !existing.isDestroyed()) {
        if (existing.isMinimized()) existing.restore()
        existing.focus()
        return
      }

      const win = buildAgentWindow(ctx)
      agentWindow = win
      win.on('closed', function () {
        if (agentWindow === win) agentWindow = null
      })
    }
  }
}

export { buildAgentWindowPort }
export type { AgentWindowPort }
