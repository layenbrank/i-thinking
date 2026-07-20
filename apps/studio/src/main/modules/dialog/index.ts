import type { AppContext } from '../../app-context'
import type { StudioModule } from '../../module'
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
