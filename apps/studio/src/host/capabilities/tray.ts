import { app, Menu, nativeImage, Tray, type MenuItemConstructorOptions } from 'electron'

import type { Context } from '../framework/context'
import type { Plugin } from '../framework/module'
import type { AgentWindowPort } from './agent-window'
import type { MainWindowPort } from './window'
import { findAppIconPath } from './window-factory'

/**
 * 系统托盘。
 *
 * 为什么需要它：主窗口与 Agent 窗口都关掉之后，进程**还活着**（overlay 窗口一直存在，
 * `window-all-closed` 因此不触发），但界面上再无东西可点 —— 没有托盘就是个回不去的死角。
 * 「关闭主窗口 = 收进托盘」这条规则在 `window.ts` 里，托盘负责把它叫回来。
 *
 * 图标不能用 `public/`（打包后不存在，见 `window-factory.ts` 的说明），
 * 找不到图标时**不建托盘**并记一条 warn —— 建一个没图标的空壳只会让人以为托盘坏了。
 */

interface TrayDeps {
  mainWindow: MainWindowPort
  agentWindow: AgentWindowPort
}

/** Windows 从多尺寸 .ico 里自己挑，别缩；其他平台缩到托盘尺寸（否则 256px 会糊） */
function toTrayImage(iconPath: string) {
  const image = nativeImage.createFromPath(iconPath)
  return process.platform === 'win32' ? image : image.resize({ width: 18, height: 18 })
}

function buildPlugin(deps: TrayDeps): Plugin {
  let tray: Tray | null = null

  return {
    name: 'tray',

    register(ctx: Context) {
      const log = ctx.logger.child('tray')
      const iconPath = findAppIconPath()

      if (!iconPath) {
        log.warn('托盘图标缺失，跳过托盘（检查 public/icon.* 是否随包发出）')
        return
      }

      const template: MenuItemConstructorOptions[] = [
        {
          label: '打开主窗口',
          click() {
            deps.mainWindow.toReveal()
          }
        },
        {
          label: '打开 Agent 窗口',
          click() {
            deps.agentWindow.toOpen()
          }
        },
        { type: 'separator' },
        {
          label: `退出 ${app.getName()}`,
          click() {
            app.quit()
          }
        }
      ]

      const instance = new Tray(toTrayImage(iconPath))
      instance.setToolTip(app.getName())
      instance.setContextMenu(Menu.buildFromTemplate(template))

      // macOS 左键单击默认弹菜单，绑 click 会把菜单抢掉；Windows/Linux 才绑「单击叫出窗口」
      if (process.platform !== 'darwin') {
        instance.on('click', function () {
          deps.mainWindow.toReveal()
        })
      }

      instance.on('double-click', function () {
        deps.mainWindow.toReveal()
      })

      tray = instance
      log.info('托盘已创建')
    },

    dispose() {
      tray?.destroy()
      tray = null
    }
  }
}

export { buildPlugin }
export type { TrayDeps }
