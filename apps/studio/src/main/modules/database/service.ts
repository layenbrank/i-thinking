import type { UserRecord } from '@shared/ipc/contracts'
import type {
  UserCreateInput,
  UserRemoveInput,
  UserUpdateInput
} from '@shared/ipc/schemas'
import { UserRepository } from './repositories/user-repository'

export class DatabaseService {
  private readonly users = new UserRepository()

  listUsers(): Promise<UserRecord[]> {
    return this.users.list()
  }

  createUser(input: UserCreateInput): Promise<UserRecord> {
    return this.users.create(input)
  }

  updateUser(input: UserUpdateInput): Promise<UserRecord> {
    return this.users.update(input)
  }

  removeUser(input: UserRemoveInput): Promise<void> {
    return this.users.remove(input)
  }
}
