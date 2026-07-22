import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerScreenshotHandlers } from './handlers'
import { ScreenshotService } from './service'

function buildScreenshotModule(): StudioModule {
  return {
    name: 'screenshot',
    register(ctx: AppContext) {
      const service = new ScreenshotService(ctx.corex)
      registerScreenshotHandlers(ctx, service)
      ctx.logger.child('screenshot').info('registered')
    }
  }
}

export { buildScreenshotModule }
export { ScreenshotService } from './service'
