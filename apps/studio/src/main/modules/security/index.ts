import { session, type WebContents } from 'electron'
import type { AppContext } from '../../app-context'
import { isAllowedPageUrl } from '../../ipc/trusted-sender'
import type { StudioModule } from '../../module'

const ALLOWED_PERMISSIONS = new Set<string>([])

function buildSecurityModule(): StudioModule {
  return {
    name: 'security',
    register(ctx: AppContext) {
      const log = ctx.logger.child('security')

      session.defaultSession.setPermissionRequestHandler(function (
        _webContents,
        permission,
        callback
      ) {
        const allowed = ALLOWED_PERMISSIONS.has(permission)
        if (!allowed) {
          log.warn('denied permission', { permission })
        }
        callback(allowed)
      })

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

/** 附着到 BrowserWindow 的导航 / 开窗限制 */
function attachWindowGuards(ctx: AppContext, contents: WebContents): void {
  const log = ctx.logger.child('security')

  contents.on('will-navigate', function (event, url) {
    if (!isAllowedPageUrl(ctx, url)) {
      log.warn('blocked navigation', { url })
      event.preventDefault()
    }
  })

  contents.setWindowOpenHandler(function ({ url }) {
    log.warn('blocked window open', { url })
    return { action: 'deny' }
  })
}

export { attachWindowGuards, buildSecurityModule }
