import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  return {
    name: 'doc',
    register(ctx: AppContext) {
      const service = new Service()
      registerHandlers(ctx, service)
      ctx.logger.child('doc').info('registered')
    }
  }
}

export { buildModule }
export { Service } from './service'
