import { z } from 'zod'

import { CHANNELS } from './channels'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'

interface UpdateP {
  visible: boolean
}

type UpdateR = void

const UpdateSchema = z.object({
  visible: z.boolean()
})

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

export { buildPlugin, UpdateSchema }
export type { UpdateP, UpdateR }
