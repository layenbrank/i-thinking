import { randomUUID } from 'node:crypto'
import { existsSync, mkdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'

import Database from 'better-sqlite3'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { z } from 'zod'

import { auth } from '../../drizzle/schema'
import { adoptBaseline } from './database-migrate'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { CHANNELS } from './channels'
import { findAppRoot } from './paths'

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

type Sqlite = InstanceType<typeof Database>
type Conn = ReturnType<typeof drizzle>

let sqlite: Sqlite | null = null
let client: Conn | null = null
let logger: { info: (message: string) => void } | null = null

/** client（Tauri）的 bundle identifier，取自 apps/client/src-tauri/tauri.conf.json */
const CLIENT_IDENTIFIER = 'com.i-thinking.corex'
/** 库文件名，取自 apps/client/src-tauri/crates/database/src/storage.rs 的 database_path() */
const DATABASE_FILE = 'i-thinking.db'

/**
 * 库文件路径：与 client（Tauri 版，另一架构的同实现）**保持同一位置与格式**，
 * 这样两版互切时数据可复用；但用户只装其一，建表由各自完成（本文件负责 studio）。
 * client 侧取 Tauri 的 `app_local_data_dir()/i-thinking.db`（见 src-tauri/src/app/bootstrap.rs），
 * 这里按平台复刻该目录 —— 不能用 Electron 的 userData，
 * Windows 下二者根目录不同（LocalAppData vs Roaming）。
 */
function findSharedDatabasePath(): string {
  const home = homedir()
  const root =
    process.platform === 'win32'
      ? process.env.LOCALAPPDATA || join(home, 'AppData', 'Local')
      : process.platform === 'darwin'
        ? join(home, 'Library', 'Application Support')
        : process.env.XDG_DATA_HOME || join(home, '.local', 'share')

  return join(root, CLIENT_IDENTIFIER, DATABASE_FILE)
}

/**
 * 打开库并应用迁移（studio 自己建表；Drizzle 官方 migrator，无需 CLI ——
 * Prisma 的 `migrate deploy` 在 Electron 内不可用，已实测）。
 * 连接级 pragma 与 Tauri 版 storage.rs 的 configure() 保持一致。
 */
function findClient(): Conn {
  if (client) return client

  const dbPath = findSharedDatabasePath()
  const dbDir = dirname(dbPath)
  if (!existsSync(dbDir)) mkdirSync(dbDir, { recursive: true })

  const file = new Database(dbPath)
  file.pragma('journal_mode = WAL')
  file.pragma('synchronous = NORMAL')
  file.pragma('busy_timeout = 5000')
  file.pragma('foreign_keys = ON')

  const migrationsFolder = join(findAppRoot(), 'drizzle', 'migrations')
  adoptBaseline(file, migrationsFolder, function (message) {
    logger?.info(message)
  })

  const db = drizzle({ client: file })
  migrate(db, { migrationsFolder })

  sqlite = file
  client = db
  logger?.info('数据库就绪（better-sqlite3 + Drizzle）')
  return client
}

function closeDatabase(): void {
  sqlite?.close()
  sqlite = null
  client = null
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
    const rows = await findClient().select().from(auth).orderBy(auth.id)
    return rows.map(toRecord)
  }

  async toWrite(input: WriteP): Promise<ReadR> {
    const now = new Date()
    const rows = await findClient()
      .insert(auth)
      .values({
        id: randomUUID(),
        name: input.name ?? null,
        email: input.email ? input.email : null,
        createdAt: now,
        updatedAt: now
      })
      .returning()
    return toRecord(rows[0])
  }

  async toUpdate(input: UpdateP): Promise<ReadR> {
    const rows = await findClient()
      .update(auth)
      .set({
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.email !== undefined
          ? { email: input.email ? input.email : null }
          : {}),
        // 旧实现靠 Prisma 的 @updatedAt 自动维护
        updatedAt: new Date()
      })
      .where(eq(auth.id, input.id))
      .returning()
    if (rows.length === 0) {
      throw new Error(`[USER] 记录不存在: ${input.id}`)
    }
    return toRecord(rows[0])
  }

  async toRemove(input: RemoveP): Promise<void> {
    // 旧实现用 Prisma delete，目标不存在时会报错；保持一致
    const rows = await findClient()
      .delete(auth)
      .where(eq(auth.id, input.id))
      .returning()
    if (rows.length === 0) {
      throw new Error(`[USER] 记录不存在: ${input.id}`)
    }
  }
}

function buildPlugin(): Plugin {
  const users = new Repository()
  return {
    name: 'database',
    register(ctx: Context) {
      logger = ctx.logger.child('database')
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
      closeDatabase()
    }
  }
}

export type { WriteP, UpdateP, RemoveP, ReadR, WriteR, UpdateR, RemoveR }
export { WriteSchema, UpdateSchema, RemoveSchema, Repository, buildPlugin }
