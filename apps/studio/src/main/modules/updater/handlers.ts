import { CHANNELS } from '@shared/ipc/channels'
import type { AppContext } from '@main/app-context'
import { registerHandler } from '@main/ipc/handle'
import type { Service } from './service'

function registerHandlers(ctx: AppContext, service: Service): void {
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
