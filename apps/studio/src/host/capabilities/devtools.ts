import type { Context } from '../framework/context'
import { registerHandler } from '../framework/handle'
import type { Plugin } from '../framework/module'
import { CHANNELS } from '../../shared/ipc/channels'
import { UpdateSchema } from '../../shared/ipc/specs/devtools'
import type { In, Out } from '../../shared/ipc/specs'

type UpdateP = In<typeof CHANNELS.DEVTOOLS.UPDATE>
type UpdateR = Out<typeof CHANNELS.DEVTOOLS.UPDATE>

function buildPlugin(): Plugin {
  return {
    name: 'devtools',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.DEVTOOLS.UPDATE, UpdateSchema, function (input) {
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

export type { UpdateP, UpdateR }
export { buildPlugin }
// 临时 re-export：specs 批次收尾时移除
export { UpdateSchema } from '../../shared/ipc/specs/devtools'
