import type { AppContext } from '@main/app-context'
import type { StudioModule } from '@main/module'
import { disconnectPrisma } from './client'
import { registerDatabaseHandlers } from './handlers'
import { DatabaseService } from './service'

function buildDatabaseModule(): StudioModule {
  const service = new DatabaseService()
  return {
    name: 'database',
    register(ctx: AppContext) {
      registerDatabaseHandlers(ctx, service)
      ctx.logger.child('database').info('registered (repository API only)')
    },
    async dispose() {
      await disconnectPrisma()
    }
  }
}

export { buildDatabaseModule, DatabaseService }
