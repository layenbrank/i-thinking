import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'updater',
    register(ctx: Context) {
      const service = new Service(ctx)
      service.configure()
      registerHandlers(ctx, service)
      ctx.logger.child('updater').info('registered', service.findStatus())
    }
  }
}

export { buildModule, Service }
