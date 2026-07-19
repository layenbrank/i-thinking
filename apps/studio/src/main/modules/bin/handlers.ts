import { CHANNELS } from '../../../shared/ipc/channels'
import { binExecSchema, binNameSchema } from '../../../shared/ipc/schemas'
import type { AppContext } from '../../app-context'
import { registerHandler } from '../../ipc/handle'
import type { BinService } from './service'

export function registerBinHandlers(ctx: AppContext, service: BinService): void {
  registerHandler(ctx, CHANNELS.BIN_GET_PATH, binNameSchema, function (input) {
    return service.findPath(input.exeName)
  })
  registerHandler(ctx, CHANNELS.BIN_EXEC, binExecSchema, function (input) {
    return service.exec(input.exeName, input.args)
  })
}
