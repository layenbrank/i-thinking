import { CHANNELS } from '../../../shared/ipc/channels'
import { Service } from '../../capabilities/dialog'
import type { Context } from '../../framework/context'
import type { DomainHandlers } from '../types'

export function buildDialogHandlers(ctx: Context): DomainHandlers<'dialog'> {
  const service = new Service(function () {
    return ctx.toReadWindow()
  })

  return {
    [CHANNELS.DIALOG.OPEN]: function (input) {
      return service.open(input)
    },
    [CHANNELS.DIALOG.SAVE]: function (input) {
      return service.save(input)
    }
  }
}
