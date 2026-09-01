import type { Context } from '@main/context'
import type { StudioModule } from '@main/module'
import { disconnectPrisma } from './client'
import { registerHandlers } from './handlers'
import { Repository } from './repositories/user'

function buildModule(): StudioModule {
  const users = new Repository()
  return {
    name: 'database',
    register(ctx: Context) {
      registerHandlers(ctx, users)
      ctx.logger.child('database').info('registered (repository API only)')
    },
    async dispose() {
      await disconnectPrisma()
    }
  }
}

export { buildModule }
