import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { Repository } from './repositories/user'
import { createSchema, removeSchema, updateSchema } from './schemas'

function registerHandlers(ctx: AppContext, users: Repository): void {
  registerHandler(ctx, CHANNELS.USER.LIST, null, function () {
    return users.list()
  })
  registerHandler(ctx, CHANNELS.USER.CREATE, createSchema, function (input) {
    return users.create(input)
  })
  registerHandler(ctx, CHANNELS.USER.UPDATE, updateSchema, function (input) {
    return users.update(input)
  })
  registerHandler(ctx, CHANNELS.USER.REMOVE, removeSchema, function (input) {
    return users.remove(input)
  })
}

export { registerHandlers }
