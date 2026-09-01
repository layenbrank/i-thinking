import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'doc',
    register(ctx: Context) {
      const service = new Service()
      registerHandlers(ctx, service)
      ctx.logger.child('doc').info('registered')
    }
  }
}

export { Service } from './service'
export { buildModule }
