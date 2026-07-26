import { ask } from '@tauri-apps/plugin-dialog'
import { check } from '@tauri-apps/plugin-updater'
import { message } from 'antd'

import { relaunchApp } from '@/utils/process'

async function checkUpdate() {
  try {
    const update = await check()
    if (!update) {
      message.info('当前已是最新版本')
      return
    }

    const confirmed = await ask(
      `发现新版本 ${update.version}${update.body ? `\n\n${update.body}` : ''}\n\n是否下载并安装？`,
      {
        title: '检查更新',
        kind: 'info',
        okLabel: '安装',
        cancelLabel: '稍后'
      }
    )

    if (!confirmed) return

    message.loading({ content: '正在下载更新…', key: 'updater', duration: 0 })
    await update.downloadAndInstall()
    message.destroy('updater')
    message.success('更新已安装，即将重启')
    await relaunchApp()
  } catch (error) {
    message.destroy('updater')
    const text = error instanceof Error ? error.message : String(error)
    message.info(`检查更新失败：${text}`)
  }
}

export { checkUpdate }
