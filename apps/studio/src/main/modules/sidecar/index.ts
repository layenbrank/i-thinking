import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerSidecarHandlers } from './handlers'
import { SidecarService } from './service'

function buildSidecarModule(): StudioModule {
  const service = new SidecarService()
  return {
    name: 'sidecar',
    register(ctx: AppContext) {
      registerSidecarHandlers(ctx, service)
      ctx.logger.child('sidecar').info('registered')
    }
  }
}

export { buildSidecarModule }
export { isAllowedSidecarName } from './allowlist'
export { SidecarService } from './service'
