/**
 * 数据库集成校验：真实 better-sqlite3（Electron ABI）+ Drizzle 官方 migrator。
 *
 * 与 database-migrate.test.ts 的分工：那边用 node:sqlite 替身验采纳逻辑（普通 Node 可跑）；
 * 这边走真实引擎与真实迁移文件，覆盖启动路径上的三件事：
 *   1. 空库：建表 + 种子数据一次到位
 *   2. 幂等：重复 migrate() 不重复执行、不二次播种
 *   3. 兼容旧库：另一版（Tauri/client，或旧的 Prisma 版）已建好表的库 ——
 *      采纳基线后不再重复 CREATE TABLE、且既有数据不被改动
 *
 * better-sqlite3 是按 Electron ABI 编译的原生模块，普通 Node 加载会 ABI 不匹配，
 * 因此本文件被 vitest.config.ts 排除在 test:unit 之外，改用 Electron 运行时执行：
 *
 *   pnpm --filter @i-thinking/studio test:db
 */
import type { Database as SqliteHandle } from 'better-sqlite3'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'
import { adoptBaseline } from './database-migrate'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const MIGRATIONS_FOLDER = join(PACKAGE_ROOT, 'drizzle', 'migrations')
/** v1 参照快照（= Tauri 版 migrations_v001.rs 的 DDL + 种子） */
const LEGACY_FIXTURE = join(PACKAGE_ROOT, 'scripts', 'fixtures', 'legacy-v1.sql')

/** 业务表数量（不含 Drizzle 记账表），与 scripts/check-schema-parity.mjs 的口径一致 */
const BUSINESS_TABLE_COUNT = 13
/** 种子行数，取自 Tauri 版 migrations_v001.rs（138 条 INSERT OR IGNORE） */
const SEED_ROWS = { magneticTile: 136, mirror: 1, countdown: 1 }

const handles: SqliteHandle[] = []
const tempDirs: string[] = []

function openDb(): SqliteHandle {
  const dir = mkdtempSync(join(tmpdir(), 'studio-db-'))
  tempDirs.push(dir)
  const db = new Database(join(dir, 'i-thinking.db'))
  // 与 src/plugins/database.ts 的连接 pragma 保持一致
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')
  handles.push(db)
  return db
}

/** 与 database.ts 的启动顺序一致：先采纳基线，再跑迁移 */
function bootstrap(db: SqliteHandle): number {
  const adopted = adoptBaseline(db, MIGRATIONS_FOLDER)
  migrate(drizzle({ client: db }), { migrationsFolder: MIGRATIONS_FOLDER })
  return adopted
}

function tableNames(db: SqliteHandle): string[] {
  return db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map(function (row) {
      return (row as { name: string }).name
    })
    .filter(function (name) {
      return !name.startsWith('sqlite_') && !name.startsWith('__drizzle')
    })
}

function rows(db: SqliteHandle, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }
  return row.count
}

function seedRowCounts(db: SqliteHandle) {
  return {
    magneticTile: rows(db, 'magneticTile'),
    mirror: rows(db, 'mirror'),
    countdown: rows(db, 'countdown')
  }
}

afterEach(function () {
  // Windows 下句柄未释放会 EPERM，必须先关再删
  handles.splice(0).forEach(function (db) {
    db.close()
  })
  tempDirs.splice(0).forEach(function (dir) {
    rmSync(dir, { recursive: true, force: true })
  })
})

describe('Drizzle 迁移（真实引擎 better-sqlite3）', function () {
  it('空库：建表 + 种子数据一次到位', function () {
    const db = openDb()

    expect(bootstrap(db)).toBe(0)

    expect(tableNames(db)).toHaveLength(BUSINESS_TABLE_COUNT)
    expect(rows(db, '__drizzle_migrations')).toBe(2)
    expect(seedRowCounts(db)).toEqual(SEED_ROWS)
  })

  it('重复启动：迁移与播种都幂等', function () {
    const db = openDb()
    bootstrap(db)
    const before = seedRowCounts(db)

    expect(bootstrap(db)).toBe(0)

    expect(tableNames(db)).toHaveLength(BUSINESS_TABLE_COUNT)
    expect(rows(db, '__drizzle_migrations')).toBe(2)
    expect(seedRowCounts(db)).toEqual(before)
  })

  it('兼容旧库：另一版建好的库被采纳，不重复建表、不动数据', function () {
    const db = openDb()
    // 模拟"用户先用 Tauri/client 版建过库，再切到 studio"
    db.exec(readFileSync(LEGACY_FIXTURE, 'utf8'))
    expect(tableNames(db)).toHaveLength(BUSINESS_TABLE_COUNT)
    // 另一版建的库里没有 Drizzle 记账表 —— 这正是需要采纳基线的场景
    expect(tableNames(db)).not.toContain('__drizzle_migrations')

    // 旧库里手写一条业务数据，采纳 + 迁移后必须原样保留
    db.prepare(
      'INSERT INTO "mirror" ("id", "title", "index", "createdAt", "updatedAt") VALUES (?, ?, ?, ?, ?)'
    ).run('legacy-mirror', '既有数据', 99, 1, 1)

    expect(bootstrap(db)).toBe(2)

    expect(tableNames(db)).toHaveLength(BUSINESS_TABLE_COUNT)
    expect(rows(db, '__drizzle_migrations')).toBe(2)
    // 种子是 INSERT OR IGNORE：旧库已有数据不受影响，也不重复插入
    expect(rows(db, 'magneticTile')).toBe(SEED_ROWS.magneticTile)
    expect(db.prepare('SELECT "title" FROM "mirror" WHERE "id" = ?').get('legacy-mirror')).toEqual({
      title: '既有数据'
    })

    // 再启动一次：记账已存在，迁移为 no-op
    expect(bootstrap(db)).toBe(0)
    expect(rows(db, '__drizzle_migrations')).toBe(2)
  })
})
