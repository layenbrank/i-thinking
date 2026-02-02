/**
 * 主进程仅负责：加载 SQLite（Prisma + better-sqlite3）、提供 query/execute/close。
 * 建表、插数据、查询等均由前端通过 ipcRenderer.database.query/execute 传入 SQL 完成。
 */
import { PrismaBetterSQLite3 } from '@prisma/adapter-better-sqlite3'
import { app, type IpcMain, type IpcMainInvokeEvent } from 'electron'
import { existsSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PrismaClient } from '../../../generated/prisma'

const require = createRequire(import.meta.url)
const thisDir = path.dirname(fileURLToPath(import.meta.url))
// 打包后主进程为单文件，thisDir 为 dist-electron；开发时可能为 dist-electron/ipc
const generatedPath = path.join(thisDir, '..', 'generated', 'prisma')
const generatedDir = path.dirname(generatedPath)

// ESM/打包环境下 require 进来的 CJS 依赖 __filename/__dirname，在 require 前注入
const g = globalThis as typeof globalThis & {
  __filename?: string
  __dirname?: string
}
g.__filename = path.join(generatedDir, 'index.js')
g.__dirname = generatedDir
const { PrismaClient: PrismaClientCtor } = require(generatedPath) as {
  PrismaClient: typeof PrismaClient
}

const DB_NAME = 'i-thinking.db'
let client: PrismaClient | null = null

function loadSqlite(): PrismaClient {
  if (client) return client
  const userData = app.getPath('userData')
  const dbDir = path.join(userData, 'databases')
  const dbPath = path.join(dbDir, DB_NAME)
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })
  const adapter = new PrismaBetterSQLite3({ url: `file:${dbPath}` })
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
      const rows = await loadSqlite().$queryRawUnsafe<
        Record<string, unknown>[]
      >(sql, ...params)
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
      await loadSqlite().$executeRawUnsafe(sql, ...params)
    }
  )
  ipcMain.handle('db:close', async function () {
    if (client) {
      await client.$disconnect()
      client = null
    }
  })
}
