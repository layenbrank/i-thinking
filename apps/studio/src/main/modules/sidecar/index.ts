import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import type { CorexHost } from './host'
import { registerHandlers } from './handlers'

function buildModule(): StudioModule {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    async register(ctx: AppContext) {
      corex = ctx.corex
      registerHandlers(ctx)

      try {
        await ctx.corex.start()
        ctx.logger.child('sidecar').info('registered', {
          corexModules: ctx.corex.findModules(),
          version: ctx.corex.findVersion()
        })
      } catch (error) {
        if (!ctx.isDev) {
          throw error
        }
        ctx.logger.child('sidecar').error('corex start failed (dev degraded)', error)
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
export { CorexHost } from './host'
export { findStatus } from './status'
export { findCliPath, findDaemonPath, findPandocPath, findSidecarRoot } from './paths'
