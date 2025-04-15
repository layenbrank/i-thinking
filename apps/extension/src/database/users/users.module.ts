import { database } from '@/database/slide-app.database.ts'
import { BaseModule } from '@/database/base.module.ts'
import type { Users } from './users.entity.ts'
import { Singleton } from '@desktop-widgets/core'

@Singleton()
export class UsersModule extends BaseModule<Users, 'id'> {
  constructor() {
    super(database.users)
  }
}

export const usersModule = new UsersModule()
