import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { registerDialogHandlers } from './handlers'
import { DialogService } from './service'

function buildDialogModule(): StudioModule {
  return {
    name: 'dialog',
    register(ctx: AppContext) {
      const service = new DialogService(function () {
        return ctx.findWindow()
      })
      registerDialogHandlers(ctx, service)
      ctx.logger.child('dialog').info('registered')
    }
  }
}

export { buildDialogModule }
