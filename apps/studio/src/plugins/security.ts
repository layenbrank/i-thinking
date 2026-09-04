import { session, type WebContents } from 'electron'

import type { Context } from './context'
import type { Plugin } from './module'
import { isAllowedPageUrl } from './trusted-sender'
import { canOpenUrl, openChrome } from './shell'

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

      // 仅约束应用 defaultSession；persist:chrome 浏览器内容区不受此 CSP
      session.defaultSession.webRequest.onHeadersReceived(function (details, callback) {
        const csp = ctx.isDev
          ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' http://127.0.0.1:* http://localhost:* https: ws: wss:; font-src 'self' data:;"
          : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; font-src 'self' data:;"

        const headers = { ...details.responseHeaders }
        headers['Content-Security-Policy'] = [csp]
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

  // 外链用应用内 Chromium（地址栏窗）打开
  contents.setWindowOpenHandler(function ({ url }) {
    if (canOpenUrl(url)) {
      openChrome(url)
    } else {
      log.warn('blocked window open', { url })
    }
    return { action: 'deny' }
  })
}

export { attachGuards, buildPlugin }
