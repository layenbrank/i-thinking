import type { UserRecord } from '@shared/ipc/contracts'
import type {
  UserCreateInput,
  UserRemoveInput,
  UserUpdateInput
} from '@shared/ipc/schemas'
import { findPrismaClient } from '../client'

function toRecord(row: {
  id: number
  createdAt: Date
  updatedAt: Date
  name: string | null
  email: string | null
}): UserRecord {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    email: row.email
  }
}

export class UserRepository {
  async list(): Promise<UserRecord[]> {
    const rows = await findPrismaClient().user.findMany({
      orderBy: { id: 'asc' }
    })
    return rows.map(toRecord)
  }

  async create(input: UserCreateInput): Promise<UserRecord> {
    const row = await findPrismaClient().user.create({
      data: {
        name: input.name ?? null,
        email: input.email ? input.email : null
      }
    })
    return toRecord(row)
  }

  async update(input: UserUpdateInput): Promise<UserRecord> {
    const row = await findPrismaClient().user.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined
          ? { email: input.email ? input.email : null }
          : {})
      }
    })
    return toRecord(row)
  }

  async remove(input: UserRemoveInput): Promise<void> {
    await findPrismaClient().user.delete({ where: { id: input.id } })
  }
}
