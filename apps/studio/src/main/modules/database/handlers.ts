import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import { RemoveSchema, UpdateSchema, WriteSchema } from '@shared/ipc/user'
import type { Repository } from './repositories/user'

function registerHandlers(ctx: Context, users: Repository): void {
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
