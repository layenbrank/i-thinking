import { CHANNELS } from '../../../shared/ipc/channels'
import { IpcError } from '../../../shared/ipc/error'
import { type Context } from '../../framework/context'
import { type DomainHandlers } from '../types'

export function buildDevtoolsHandlers(ctx: Context): DomainHandlers<'devtools'> {
  return {
    // 用 sender 而不是主窗口：多窗口下每个窗口开自己的 DevTools
    [CHANNELS.DEVTOOLS.UPDATE]: function (input, event) {
      if (!ctx.isDev) {
        throw new IpcError('DEVTOOLS_DISABLED', 'DevTools disabled in production')
      }
      const contents = event.sender
      if (contents.isDestroyed()) return
      if (input.visible) {
        contents.openDevTools({ mode: 'detach' })
      } else {
        contents.closeDevTools()
      }
    }
  }
}
