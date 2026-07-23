import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'screenshot',
    register(ctx: AppContext) {
      const service = new Service(ctx.corex)
      registerHandlers(ctx, service)
      ctx.logger.child('screenshot').info('registered')
    }
  }
}

export { buildModule }
export { Service } from './service'
