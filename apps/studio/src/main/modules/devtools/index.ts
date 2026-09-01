import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import type { StudioModule } from '@main/module'
import { CHANNELS } from '@shared/ipc/channels'
import { UpdateVisibleSchema } from '@shared/ipc/devtools'

function buildModule(): StudioModule {
  return {
    name: 'devtools',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.DEVTOOLS.UPDATE_VISIBLE, UpdateVisibleSchema, function (input) {
        if (!ctx.isDev) {
          throw new Error('DevTools disabled in production')
        }
        const win = ctx.toReadWindow()
        if (!win) return
        if (input.visible) {
          win.webContents.openDevTools({ mode: 'detach' })
        } else win.webContents.closeDevTools()
      })
      ctx.logger.child('devtools').info('registered')
    }
  }
}

export { buildModule }
