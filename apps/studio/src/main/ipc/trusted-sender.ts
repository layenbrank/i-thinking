import type { Context } from '@main/context'
import type { IpcMainInvokeEvent } from 'electron'

/**
 * 仅信任：已登记的本应用 WebContents，且 URL 落在允许 origin / 生产 file:。
 */
export function isTrustedSender(ctx: Context, event: IpcMainInvokeEvent): boolean {
  const sender = event.sender
  if (!sender || sender.isDestroyed()) return false
  if (!ctx.isTrustedWebContents(sender)) return false

  let url = ''
  try {
    url = event.senderFrame?.url || sender.getURL() || ''
  } catch {
    return false
  }
  if (!url) return false

  return isAllowedPageUrl(ctx, url)
}

export function isAllowedPageUrl(ctx: Context, url: string): boolean {
  if (ctx.isDev) {
    const origins = ctx.toReadOrigins()
    if (origins.length > 0) {
      return origins.some(function (origin) {
        return url === origin || url.startsWith(origin + '/')
      })
    }
    // 未配置 origin 时回退：仅本机环回（仍要求 webContents 已登记）
    return url.startsWith('http://localhost:') || url.startsWith('http://127.0.0.1:')
  }

  // 生产：仅 file: 协议（打包本地页面）
  return url.startsWith('file:')
}
