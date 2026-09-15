import { CHANNELS } from '../../../shared/ipc/channels'
import { IpcError } from '../../../shared/ipc/error'
import { type Context } from '../../framework/context'
import { type DomainHandlers } from '../types'

export function buildDevtoolsHandlers(ctx: Context): DomainHandlers<'devtools'> {
  return {
    [CHANNELS.DEVTOOLS.UPDATE]: function (input) {
      if (!ctx.isDev) {
        throw new IpcError('DEVTOOLS_DISABLED', 'DevTools disabled in production')
      }
      const win = ctx.toReadWindow()
      if (!win) return
      if (input.visible) {
        win.webContents.openDevTools({ mode: 'detach' })
      } else {
        win.webContents.closeDevTools()
      }
    }
  }
}
