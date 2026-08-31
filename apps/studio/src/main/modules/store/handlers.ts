import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { HasSchema, ReadSchema, RemoveSchema, WriteSchema } from '@shared/ipc/store'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.STORE.READ, ReadSchema, function (input) {
    return service.toRead(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.WRITE, WriteSchema, function (input) {
    service.toWrite(input.key, input.value)
  })
  registerHandler(ctx, CHANNELS.STORE.HAS, HasSchema, function (input) {
    return service.has(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.REMOVE, RemoveSchema, function (input) {
    service.toRemove(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.CLEAR, null, function () {
    service.clear()
  })
  registerHandler(ctx, CHANNELS.STORE.KEYS, null, function () {
    return service.keys()
  })
}

export { registerHandlers }
