import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'dialog',
    register(ctx: Context) {
      const service = new Service(function () {
        return ctx.toReadWindow()
      })
      registerHandlers(ctx, service)
      ctx.logger.child('dialog').info('registered')
    }
  }
}

export { buildModule }
