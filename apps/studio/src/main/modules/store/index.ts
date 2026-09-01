import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import { Service } from './service'

function buildModule(): StudioModule {
  const service = new Service()
  return {
    name: 'store',
    register(ctx: Context) {
      registerHandlers(ctx, service)
      ctx.logger.child('store').info('registered')
    }
  }
}

/** 供单测 */
export { buildModule, Service }
