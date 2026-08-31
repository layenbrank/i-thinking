import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import type { CorexHost } from './host'
import { registerHandlers } from './handlers'

function buildModule(): StudioModule {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    register(ctx: AppContext) {
      corex = ctx.corex
      registerHandlers(ctx)

      // 后台启动：不阻塞 bootstrap，避免拖死后续模块（如 devtools）注册
      const log = ctx.logger.child('sidecar')
      void ctx.corex
        .start()
        .then(function () {
          log.info('registered', {
            corexActionCount: ctx.corex.findActions().length,
            hasScreenshot: ctx.corex.hasAction('capture.screenshot'),
            version: ctx.corex.findVersion()
          })
        })
        .catch(function (error) {
          log.error('corex start failed (degraded)', error)
        })
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
export { findCliPath, findCorexDataDir, findDaemonPath, findDefaultIpcEndpoint, findPandocPath, findSidecarRoot } from './paths'
