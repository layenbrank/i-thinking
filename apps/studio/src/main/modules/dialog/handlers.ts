import { CHANNELS } from '../../../shared/ipc/channels'
import { dialogOpenSchema, dialogSaveSchema } from '../../../shared/ipc/schemas'
import type { AppContext } from '../../app-context'
import { registerHandler } from '../../ipc/handle'
import type { DialogService } from './service'

export function registerDialogHandlers(ctx: AppContext, service: DialogService): void {
  registerHandler(ctx, CHANNELS.DIALOG_OPEN, dialogOpenSchema, function (input) {
    return service.open(input)
  })
  registerHandler(ctx, CHANNELS.DIALOG_SAVE, dialogSaveSchema, function (input) {
    return service.save(input)
  })
}
