import { existsSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { app } from 'electron'
import { z } from 'zod'

import type { PrismaClient } from '@generated/prisma'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { CHANNELS } from './channels'
import { findAppRequire, findAppRoot } from './paths'

interface WriteP {
  name?: string
  /** 合法邮箱，或空字符串表示清空 */
  email?: string
}

interface UpdateP {
  id: string
  name?: string
  email?: string
}

interface RemoveP {
  id: string
}

interface ReadR {
  id: string
  createdAt: string
  updatedAt: string
  name: string | null
  email: string | null
}

type WriteR = ReadR
type UpdateR = ReadR
type RemoveR = void

const OptionalEmail = z.union([z.string().email(), z.literal('')]).optional()

const WriteSchema = z.object({
  name: z.string().optional(),
  email: OptionalEmail
})

const UpdateSchema = z.object({
  id: z.uuid(),
  name: z.string().optional(),
  email: OptionalEmail
})

const RemoveSchema = z.object({
  id: z.uuid()
})

let PrismaClientCtor: typeof PrismaClient | null = null
let client: PrismaClient | null = null

function findClientCtor(): typeof PrismaClient {
  if (PrismaClientCtor) return PrismaClientCtor

  const root = findAppRoot()
  const generatedPath = join(root, 'generated', 'prisma')
  const generatedDir = dirname(generatedPath)
  const g = globalThis as typeof globalThis & {
    __filename?: string
    __dirname?: string
  }
  g.__filename = join(generatedDir, 'index.js')
  g.__dirname = generatedDir

  const require = findAppRequire()
  const mod = require(generatedPath) as { PrismaClient: typeof PrismaClient }
  PrismaClientCtor = mod.PrismaClient
  return PrismaClientCtor
}

function findClient(): PrismaClient {
  if (client) return client

  const Ctor = findClientCtor()
  const userData = app.getPath('userData')
  const dbDir = join(userData, 'databases')
  const dbPath = join(dbDir, 'i-thinking.db')

  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  client = new Ctor({ adapter })
  return client
}

async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect()
    client = null
  }
}

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

class Repository {
  async toRead(): Promise<ReadR[]> {
    const rows = await findClient().auth.findMany({
      orderBy: {
        id: 'asc'
      }
    })
    return rows.map(toRecord)
  }

  async toWrite(input: WriteP): Promise<ReadR> {
    const row = await findClient().auth.create({
      data: {
        name: input.name ?? null,
        email: input.email ? input.email : null
      }
    })
    return toRecord(row)
  }

  async toUpdate(input: UpdateP): Promise<ReadR> {
    const row = await findClient().auth.update({
      where: { id: input.id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined ? { email: input.email ? input.email : null } : {})
      }
    })
    return toRecord(row)
  }

  async toRemove(input: RemoveP): Promise<void> {
    await findClient().auth.delete({ where: { id: input.id } })
  }
}

function buildPlugin(): Plugin {
  const users = new Repository()
  return {
    name: 'database',
    register(ctx: Context) {
      registerHandler(ctx, CHANNELS.USER.READ, null, function () {
        return users.toRead()
      })
      registerHandler(ctx, CHANNELS.USER.WRITE, WriteSchema, function (input) {
        return users.toWrite(input)
      })
      registerHandler(ctx, CHANNELS.USER.UPDATE, UpdateSchema, function (input) {
        return users.toUpdate(input)
      })
      registerHandler(ctx, CHANNELS.USER.REMOVE, RemoveSchema, function (input) {
        return users.toRemove(input)
      })
      ctx.logger.child('database').info('registered (repository API only)')
    },
    async dispose() {
      await disconnectPrisma()
    }
  }
}

export type { WriteP, UpdateP, RemoveP, ReadR, WriteR, UpdateR, RemoveR }
export { WriteSchema, UpdateSchema, RemoveSchema, Repository, buildPlugin }
