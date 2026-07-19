import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import type { PrismaClient } from '../../../../generated/prisma'
import { findAppRequire, findAppRoot } from '../../paths'

let PrismaClientCtor: typeof PrismaClient | null = null
let client: PrismaClient | null = null

function findPrismaClientCtor(): typeof PrismaClient {
  if (PrismaClientCtor) return PrismaClientCtor

  const root = findAppRoot()
  const generatedPath = path.join(root, 'generated', 'prisma')
  const generatedDir = path.dirname(generatedPath)
  const g = globalThis as typeof globalThis & {
    __filename?: string
    __dirname?: string
  }
  g.__filename = path.join(generatedDir, 'index.js')
  g.__dirname = generatedDir

  const require = findAppRequire()
  const mod = require(generatedPath) as { PrismaClient: typeof PrismaClient }
  PrismaClientCtor = mod.PrismaClient
  return PrismaClientCtor
}

export function findPrismaClient(): PrismaClient {
  if (client) return client
  const Ctor = findPrismaClientCtor()
  const userData = app.getPath('userData')
  const dbDir = path.join(userData, 'databases')
  const dbPath = path.join(dbDir, 'i-thinking.db')
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  client = new Ctor({ adapter })
  return client
}

export async function disconnectPrisma(): Promise<void> {
  if (client) {
    await client.$disconnect()
    client = null
  }
}
