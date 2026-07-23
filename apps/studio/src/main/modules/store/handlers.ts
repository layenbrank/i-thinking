import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import { deleteSchema, getSchema, hasSchema, setSchema } from './schemas'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
  registerHandler(ctx, CHANNELS.STORE.GET, getSchema, function (input) {
    return service.get(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.SET, setSchema, function (input) {
    service.set(input.key, input.value)
  })
  registerHandler(ctx, CHANNELS.STORE.HAS, hasSchema, function (input) {
    return service.has(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.DELETE, deleteSchema, function (input) {
    service.delete(input.key)
  })
  registerHandler(ctx, CHANNELS.STORE.CLEAR, null, function () {
    service.clear()
  })
  registerHandler(ctx, CHANNELS.STORE.KEYS, null, function () {
    return service.keys()
  })
}

export { registerHandlers }
