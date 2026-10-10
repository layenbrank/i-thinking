import type { WebviewOptions } from '@tauri-apps/api/webview'
import type { WindowOptions } from '@tauri-apps/api/window'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

type CreateOptions = Omit<WebviewOptions, 'x' | 'y' | 'width' | 'height'> & WindowOptions

/**
 * 单例窗口：已存在就聚焦，否则新建。
 *
 * `label` 即窗口身份，同 label 重复建窗会被系统拒绝 —— 必须先查再建。
 * 返回被打开/聚焦的窗口，失败时抛出，由调用方决定怎么提示。
 */
async function openWindow(label: string, route: string, title: string, options: CreateOptions) {
  const existing = await WebviewWindow.getByLabel(label)
  if (existing) {
    await existing.setFocus()
    return existing
  }

  return new WebviewWindow(label, {
    url: route,
    title,
    ...options
  })
}

export { openWindow }
export type { CreateOptions }
