import { session, shell, type WebContents } from 'electron'

import type { Context } from '../framework/context'
import type { Plugin } from '../framework/module'
import { SUGGEST_ORIGIN } from '../../shared/suggest'
import { isAllowedPageUrl } from './trusted-sender'

const ALLOWED_PERMISSIONS = new Set<string>([])

function buildPlugin(): Plugin {
  return {
    name: 'security',
    register(ctx: Context) {
      const log = ctx.logger.child('security')

      session.defaultSession.setPermissionRequestHandler(
        function (_webContents, permission, callback) {
          const allowed = ALLOWED_PERMISSIONS.has(permission)
          if (!allowed) {
            log.warn('denied permission', { permission })
          }
          callback(allowed)
        }
      )

      // 仅约束应用 defaultSession（不再托管内置浏览器，无独立分区）
      session.defaultSession.webRequest.onHeadersReceived(function (details, callback) {
        const csp = ctx.isDev
          ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:* http://localhost:* https: ws: wss:; font-src 'self' data:;"
          : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self' data:;"

        const headers = { ...details.responseHeaders }
        headers['Content-Security-Policy'] = [csp]
        // 搜索建议由页面直接请求必应。必应不回跨域头，这里只放行这一条地址。
        if (details.url.startsWith(SUGGEST_ORIGIN)) {
          headers['Access-Control-Allow-Origin'] = ['*']
        }
        callback({ responseHeaders: headers })
      })

      log.info('security session configured')
    }
  }
}

/** 附着到应用 BrowserWindow 的导航 / 开窗限制 */
function attachGuards(ctx: Context, contents: WebContents): void {
  const log = ctx.logger.child('security')

  contents.on('will-navigate', function (event, url) {
    if (!isAllowedPageUrl(ctx, url)) {
      log.warn('blocked navigation', { url })
      event.preventDefault()
    }
  })

  // 外链一律交系统默认浏览器打开（不再托管内置 Chromium 浏览）
  contents.setWindowOpenHandler(function ({ url }) {
    const parsed = new URL(url)
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      void shell.openExternal(url)
    } else {
      log.warn('blocked window open', { url })
    }
    return { action: 'deny' }
  })
}

export { attachGuards, buildPlugin }
