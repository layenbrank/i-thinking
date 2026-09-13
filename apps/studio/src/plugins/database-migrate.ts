import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Drizzle 迁移的**采纳既有库**（baseline adopt）。
 *
 * 场景：studio 与 client（Tauri 版）是同一实现的两个架构版本，共用同一库文件；
 * 用户可能先用 Tauri 版建过库，再切到 studio。此时库里已有业务表、却没有 Drizzle 的
 * 记账表，直接跑 `migrate()` 会重复执行 CREATE TABLE 而失败。
 *
 * 做法：把 journal 里每条迁移按 Drizzle 自己的记账格式登记为"已应用"。
 * 记账格式为实测确认（非推断）：
 *   - 表 `__drizzle_migrations(id, hash, created_at)`
 *   - `hash` = 迁移文件的 sha256
 *   - `created_at` = `meta/_journal.json` 里该条目的 `when`
 *
 * 该模块只依赖最小的 sqlite 接口，便于用 `node:sqlite` 单测（better-sqlite3 是 Electron ABI）。
 */

export interface MigrationStatement {
  all(...params: unknown[]): unknown[]
  run(...params: unknown[]): unknown
}

export interface MigrationDb {
  exec(sql: string): void
  prepare(sql: string): MigrationStatement
}

interface JournalEntry {
  tag: string
  when: number
}

export function migrationHash(sql: string): string {
  return createHash('sha256').update(sql).digest('hex')
}

/** 库是否已有业务表（用 magneticTile 作为标志，与另一版实现一致） */
function hasExistingSchema(db: MigrationDb): boolean {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .all('magneticTile')
  return row.length > 0
}

function readJournal(migrationsFolder: string): JournalEntry[] {
  const journalPath = join(migrationsFolder, 'meta', '_journal.json')
  if (!existsSync(journalPath)) return []
  const parsed = JSON.parse(readFileSync(journalPath, 'utf8')) as {
    entries?: JournalEntry[]
  }
  return parsed.entries ?? []
}

/**
 * @returns 本次采纳（登记为已应用）的迁移数量；0 表示无需采纳
 */
export function adoptBaseline(
  db: MigrationDb,
  migrationsFolder: string,
  log?: (message: string) => void
): number {
  if (!hasExistingSchema(db)) return 0

  const entries = readJournal(migrationsFolder)
  if (entries.length === 0) return 0

  db.exec(
    'CREATE TABLE IF NOT EXISTS "__drizzle_migrations" (id INTEGER PRIMARY KEY, hash text NOT NULL, created_at numeric)'
  )

  const known = new Set(
    (
      db.prepare('SELECT hash FROM "__drizzle_migrations"').all() as {
        hash: string
      }[]
    ).map(function (row) {
      return row.hash
    })
  )

  const pending = entries
    .map(function (entry) {
      return {
        when: entry.when,
        hash: migrationHash(
          readFileSync(join(migrationsFolder, `${entry.tag}.sql`), 'utf8')
        )
      }
    })
    .filter(function (entry) {
      return !known.has(entry.hash)
    })

  if (pending.length === 0) return 0

  const insert = db.prepare(
    'INSERT INTO "__drizzle_migrations" ("hash", "created_at") VALUES (?, ?)'
  )
  db.exec('BEGIN')
  try {
    pending.forEach(function (entry) {
      insert.run(entry.hash, entry.when)
    })
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }

  log?.(`检测到既有库结构，已采纳 ${pending.length} 个基线迁移`)
  return pending.length
}
