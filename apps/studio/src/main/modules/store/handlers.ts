import { CHANNELS } from '@shared/ipc/channels'
import {
  storeDeleteSchema,
  storeGetSchema,
  storeHasSchema,
  storeSetSchema
} from '@shared/ipc/schemas'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { StoreService } from './service'

export function registerStoreHandlers(ctx: AppContext, service: StoreService): void {
  registerHandler(ctx, CHANNELS.STORE_GET, storeGetSchema, function (input) {
    return service.get(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE_SET, storeSetSchema, function (input) {
    service.set(input.key, input.value)
  })
  registerHandler(ctx, CHANNELS.STORE_HAS, storeHasSchema, function (input) {
    return service.has(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE_DELETE, storeDeleteSchema, function (input) {
    service.delete(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE_CLEAR, null, function () {
    service.clear()
  })
  registerHandler(ctx, CHANNELS.STORE_KEYS, null, function () {
    return service.keys()
  })
}
