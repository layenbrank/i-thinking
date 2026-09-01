import type { Context } from '@main/context'
import { registerHandler } from '@main/ipc/handle'
import { CHANNELS } from '@shared/ipc/channels'
import type { Service } from './service'

function registerHandlers(ctx: Context, service: Service): void {
  registerHandler(ctx, CHANNELS.UPDATER.FIND_STATUS, null, function () {
    return service.findStatus()
  })
  registerHandler(ctx, CHANNELS.UPDATER.CHECK, null, function () {
    return service.check()
  })
  registerHandler(ctx, CHANNELS.UPDATER.DOWNLOAD, null, async function () {
    await service.download()
  })
  registerHandler(ctx, CHANNELS.UPDATER.INSTALL, null, function () {
    service.install()
  })
}

export { registerHandlers }
