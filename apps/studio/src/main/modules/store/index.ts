import type { AppContext } from '../../app-context'
import type { StudioModule } from '../../module'
import { registerStoreHandlers } from './handlers'
import { StoreService } from './service'

function buildStoreModule(): StudioModule {
  const service = new StoreService()
  return {
    name: 'store',
    register(ctx: AppContext) {
      registerStoreHandlers(ctx, service)
      ctx.logger.child('store').info('registered')
    }
  }
}

/** 供单测 */
export { buildStoreModule, StoreService }
