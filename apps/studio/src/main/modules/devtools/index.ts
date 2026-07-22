import { CHANNELS } from '@shared/ipc/channels'
import { devtoolsVisibleSchema } from '@shared/ipc/schemas'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { StudioModule } from '@main/module'

function buildDevtoolsModule(): StudioModule {
  return {
    name: 'devtools',
    register(ctx: AppContext) {
      registerHandler(
        ctx,
        CHANNELS.DEVTOOLS_UPDATE_VISIBLE,
        devtoolsVisibleSchema,
        function (input) {
          if (!ctx.isDev) {
            throw new Error('DevTools disabled in production')
          }
          const win = ctx.findWindow()
          if (!win) return
          if (input.visible) {
            win.webContents.openDevTools({ mode: 'detach' })
          } else {
            win.webContents.closeDevTools()
          }
        }
      )
      ctx.logger.child('devtools').info('registered')
    }
  }
}

export { buildDevtoolsModule }
