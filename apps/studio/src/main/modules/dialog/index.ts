import type { AppContext } from '../../app-context'
import type { StudioModule } from '../../module'
import { registerDialogHandlers } from './handlers'
import { DialogService } from './service'

export function createDialogModule(): StudioModule {
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
