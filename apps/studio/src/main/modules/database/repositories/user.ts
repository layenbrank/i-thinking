import type { WriteP, RemoveP, UpdateP, ReadR } from '@shared/ipc/user'
import { findPrismaClient } from '../client'

function toRecord(row: {
  id: string
  createdAt: Date
  updatedAt: Date
  name: string | null
  email: string | null
}): ReadR {
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    name: row.name,
    email: row.email
  }
}

export class Repository {
  async toRead(): Promise<ReadR[]> {
    const rows = await findPrismaClient().auth.findMany({
      orderBy: {
        id: 'asc'
      }
    })
    return rows.map(toRecord)
  }

  async toWrite(input: WriteP): Promise<ReadR> {
    const row = await findPrismaClient().auth.create({
      data: {
        name: input.name ?? null,
        email: input.email ? input.email : null
      }
    })
    return toRecord(row)
  }

  async toUpdate(input: UpdateP): Promise<ReadR> {
    const row = await findPrismaClient().auth.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email ? input.email : null } : {})
      }
    })
    return toRecord(row)
  }

  async toRemove(input: RemoveP): Promise<void> {
    await findPrismaClient().auth.delete({ where: { id: input.id } })
  }
}
