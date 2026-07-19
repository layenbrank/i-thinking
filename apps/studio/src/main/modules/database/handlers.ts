import { CHANNELS } from '../../../shared/ipc/channels'
import {
  userCreateSchema,
  userRemoveSchema,
  userUpdateSchema
} from '../../../shared/ipc/schemas'
import type { AppContext } from '../../app-context'
import { registerHandler } from '../../ipc/handle'
import type { DatabaseService } from './service'

export function registerDatabaseHandlers(
  ctx: AppContext,
  service: DatabaseService
): void {
  registerHandler(ctx, CHANNELS.USER_LIST, null, function () {
    return service.listUsers()
  })
  registerHandler(ctx, CHANNELS.USER_CREATE, userCreateSchema, function (input) {
    return service.createUser(input)
  })
  registerHandler(ctx, CHANNELS.USER_UPDATE, userUpdateSchema, function (input) {
    return service.updateUser(input)
  })
  registerHandler(ctx, CHANNELS.USER_REMOVE, userRemoveSchema, function (input) {
    return service.removeUser(input)
  })
}
