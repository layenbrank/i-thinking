/**
 * 主进程仅负责：加载 SQLite（Prisma + better-sqlite3）、提供 query/execute/close。
 * 建表、插数据、查询等均由前端通过 ipcRenderer.database.query/execute 传入 SQL 完成。
 */
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { app, type IpcMain, type IpcMainInvokeEvent } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '../../generated/prisma'

const require = createRequire(import.meta.url)
const thisDir = path.dirname(fileURLToPath(import.meta.url))

let PrismaClientCtor: typeof PrismaClient | null = null

function getPrismaClientCtor(): typeof PrismaClient {
  if (PrismaClientCtor) return PrismaClientCtor
  const root = process.env.APP_ROOT || path.join(thisDir, '..', '..')
  console.log('APP_ROOT', root)
  const generatedPath = path.join(root, 'generated', 'prisma')
  const generatedDir = path.dirname(generatedPath)
  const g = globalThis as typeof globalThis & {
    __filename?: string
    __dirname?: string
  }
  g.__filename = path.join(generatedDir, 'index.js')
  g.__dirname = generatedDir
  const mod = require(generatedPath) as { PrismaClient: typeof PrismaClient }
  PrismaClientCtor = mod.PrismaClient
  return PrismaClientCtor
}

const DB_NAME = 'i-thinking.db'
let client: PrismaClient | null = null
let schemaInitialized = false

const INIT_USER_TABLE = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "name" TEXT,
  "email" TEXT
);
`

async function ensureSchema(c: PrismaClient): Promise<void> {
  if (schemaInitialized) return
  await c.$executeRawUnsafe(INIT_USER_TABLE)
  schemaInitialized = true
}

function loadSqlite(): PrismaClient {
  if (client) return client
  const PrismaClientCtor = getPrismaClientCtor()
  const userData = app.getPath('userData')
  const dbDir = path.join(userData, 'databases')
  const dbPath = path.join(dbDir, DB_NAME)
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` })
  client = new PrismaClientCtor({ adapter })
  return client
}

export function registerDatabaseIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'db:query',
    async function (
      _event: IpcMainInvokeEvent,
      sql: string,
      params: Parameters<PrismaClient['$queryRawUnsafe']>[1][] = []
    ) {
      const c = loadSqlite()
      await ensureSchema(c)
      const rows = await c.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params)
      return Array.isArray(rows) ? rows : []
    }
  )
  ipcMain.handle(
    'db:execute',
    async function (
      _event: IpcMainInvokeEvent,
      sql: string,
      params: Parameters<PrismaClient['$executeRawUnsafe']>[1][] = []
    ) {
      const c = loadSqlite()
      await ensureSchema(c)
      await c.$executeRawUnsafe(sql, ...params)
    }
  )
  ipcMain.handle('db:close', async function () {
    if (client) {
      await client.$disconnect()
      client = null
    }
  })
}
