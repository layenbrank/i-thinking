import type { AppContext } from '../../app-context'
import type { StudioModule } from '../../module'
import { registerBinHandlers } from './handlers'
import { BinService } from './service'

export function createBinModule(): StudioModule {
  const service = new BinService()
  return {
    name: 'bin',
    register(ctx: AppContext) {
      registerBinHandlers(ctx, service)
      ctx.logger.child('bin').info('registered')
    }
  }
}

export { isAllowedBinName } from './allowlist'
export { BinService } from './service'
