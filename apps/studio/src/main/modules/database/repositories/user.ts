import type { CreateInput, RemoveInput, UpdateInput, UserRecord } from '../schemas'
import { findPrismaClient } from '../client'

function toRecord(row: {
  id: string
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

export class Repository {
  async list(): Promise<UserRecord[]> {
    const rows = await findPrismaClient().user.findMany({
      orderBy: {
        id: 'asc'
      }
    })
    return rows.map(toRecord)
  }

  async create(input: CreateInput): Promise<UserRecord> {
    const row = await findPrismaClient().user.create({
      data: {
        name: input.name ?? null,
        email: input.email ? input.email : null
      }
    })
    return toRecord(row)
  }

  async update(input: UpdateInput): Promise<UserRecord> {
    const row = await findPrismaClient().user.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email ? input.email : null } : {})
      }
    })
    return toRecord(row)
  }

  async remove(input: RemoveInput): Promise<void> {
    await findPrismaClient().user.delete({ where: { id: input.id } })
  }
}
