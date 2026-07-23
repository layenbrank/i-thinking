import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'dialog',
    register(ctx: AppContext) {
      const service = new Service(function () {
        return ctx.findWindow()
      })
      registerHandlers(ctx, service)
      ctx.logger.child('dialog').info('registered')
    }
  }
}

export { buildModule }
