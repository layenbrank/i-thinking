import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'screenshot',
    register(ctx: Context) {
      const service = new Service(ctx.corex)
      registerHandlers(ctx, service)
      ctx.logger.child('screenshot').info('registered')
    }
  }
}

export { Service } from './service'
export { buildModule }
