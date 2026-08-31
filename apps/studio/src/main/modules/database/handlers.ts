import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { Repository } from './repositories/user'
import { RemoveSchema, UpdateSchema, WriteSchema } from '@shared/ipc/user'

function registerHandlers(ctx: AppContext, users: Repository): void {
  registerHandler(ctx, CHANNELS.USER.READ, null, function () {
    return users.toRead()
  })
  registerHandler(ctx, CHANNELS.USER.WRITE, WriteSchema, function (input) {
    return users.toWrite(input)
  })
  registerHandler(ctx, CHANNELS.USER.UPDATE, UpdateSchema, function (input) {
    return users.toUpdate(input)
  })
  registerHandler(ctx, CHANNELS.USER.REMOVE, RemoveSchema, function (input) {
    return users.toRemove(input)
  })
}

export { registerHandlers }
