import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { registerHandlers } from './handlers'
import type { CorexHost } from './host'

function buildModule(): StudioModule {
  let corex: CorexHost | null = null

  return {
    name: 'sidecar',
    register(ctx: Context) {
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

export { CorexHost } from './host'
export {
  findCliPath,
  findCorexDataDir,
  findDaemonPath,
  findDefaultIpcEndpoint,
  findPandocPath,
  findSidecarRoot
} from './paths'
export { findStatus } from './status'
export { buildModule }
