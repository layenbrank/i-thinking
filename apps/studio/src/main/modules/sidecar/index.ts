import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import type { CorexHost } from './corex-host'
import { registerHandlers } from './handlers'

function buildModule(): StudioModule {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    async register(ctx: AppContext) {
      corex = ctx.corex
      registerHandlers(ctx, ctx.sidecars)
      try {
        await ctx.corex.start()
        ctx.logger.child('sidecar').info('registered', {
          corexModules: ctx.corex.findModules()
        })
      } catch (error) {
        // 常驻能力不可用时仍允许壳启动；域模块 invoke 时再失败
        ctx.logger.child('sidecar').error('corex start failed', error)
      }
    },
    async dispose() {
      if (!corex) {
        return
      }
      await corex.stop()
    }
  }
}

export { buildModule }
export { isAllowedSidecarName } from './allowlist'
export { Service } from './service'
export { CorexHost } from './corex-host'
