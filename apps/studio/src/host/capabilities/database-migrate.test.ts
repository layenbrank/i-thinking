import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { adoptBaseline } from './database-migrate'
import type { MigrationDb } from './database-migrate'

/** better-sqlite3 是 Electron ABI，测试里用 node:sqlite 充当同形状实现 */
const opened: DatabaseSync[] = []

function openDb(file: string): MigrationDb {
  const db = new DatabaseSync(file)
  opened.push(db)
  return db as unknown as MigrationDb
}

const INIT_SQL = 'CREATE TABLE "magneticTile" ("id" TEXT NOT NULL PRIMARY KEY);'
const SEED_SQL = 'INSERT INTO "magneticTile" ("id") VALUES (\'tile-1\');'
const WHEN_INIT = 1789238478993
const WHEN_SEED = 1789238631670
const WHEN_LATER = 1789366130325

let dir: string
let migrationsFolder: string
let dbPath: string

function writeMigrations(): void {
  mkdirSync(join(migrationsFolder, 'meta'), { recursive: true })
  writeFileSync(join(migrationsFolder, '0000_init.sql'), INIT_SQL)
  writeFileSync(join(migrationsFolder, '0001_seed.sql'), SEED_SQL)
  writeFileSync(
    join(migrationsFolder, 'meta', '_journal.json'),
    JSON.stringify({
      version: '7',
      dialect: 'sqlite',
      entries: [
        { idx: 0, version: '6', when: WHEN_INIT, tag: '0000_init', breakpoints: true },
        { idx: 1, version: '6', when: WHEN_SEED, tag: '0001_seed', breakpoints: true }
      ]
    })
  )
}

function readRecords(db: MigrationDb): { hash: string; created_at: number }[] {
  return db
    .prepare('SELECT hash, created_at FROM "__drizzle_migrations" ORDER BY id')
    .all() as { hash: string; created_at: number }[]
}

beforeEach(function () {
  dir = mkdtempSync(join(tmpdir(), 'adopt-baseline-'))
  migrationsFolder = join(dir, 'migrations')
  dbPath = join(dir, 'fresh.db')
  writeMigrations()
})

afterEach(function () {
  // Windows 下必须先释放句柄，否则临时目录删不掉（EPERM）
  opened.splice(0).forEach(function (db) {
    db.close()
  })
  rmSync(dir, { recursive: true, force: true })
})

describe('adoptBaseline', function () {
  it('空库：不做任何事（库由 Drizzle migrate 自己建）', function () {
    const db = openDb(dbPath)
    expect(adoptBaseline(db, migrationsFolder)).toBe(0)
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE name = '__drizzle_migrations'")
      .all()
    expect(tables).toHaveLength(0)
  })

  it('既有库（如 Tauri 版建过）：按实测格式登记基线', function () {
    const seed = openDb(dbPath)
    seed.exec(INIT_SQL)
    seed.exec(SEED_SQL)

    const count = adoptBaseline(seed, migrationsFolder)
    expect(count).toBe(2)

    const records = readRecords(seed)
    expect(
      records.map(function (row) {
        return row.hash
      })
    ).toEqual([
      createHash('sha256').update(INIT_SQL).digest('hex'),
      createHash('sha256').update(SEED_SQL).digest('hex')
    ])
    expect(
      records.map(function (row) {
        return row.created_at
      })
    ).toEqual([WHEN_INIT, WHEN_SEED])

    // 已存在的数据不被触碰
    const tiles = seed.prepare('SELECT COUNT(*) AS n FROM "magneticTile"').all() as {
      n: number
    }[]
    expect(tiles[0].n).toBe(1)
  })

  it('幂等：重复调用不再登记', function () {
    const db = openDb(dbPath)
    db.exec(INIT_SQL)
    expect(adoptBaseline(db, migrationsFolder)).toBe(2)
    expect(adoptBaseline(db, migrationsFolder)).toBe(0)
    expect(readRecords(db)).toHaveLength(2)
  })

  it('晚于 v1 基线的迁移不被采纳（须由 migrate 真实执行）', function () {
    // 模拟 v1 之后新增的迁移（如 0002 建 chat 域）：既有库也必须真实执行它，
    // 否则用户的旧库永远拿不到新表
    const laterSql = 'CREATE TABLE "chatSession" ("id" TEXT NOT NULL PRIMARY KEY);'
    writeFileSync(join(migrationsFolder, '0002_chat_domain.sql'), laterSql)
    writeFileSync(
      join(migrationsFolder, 'meta', '_journal.json'),
      JSON.stringify({
        version: '7',
        dialect: 'sqlite',
        entries: [
          { idx: 0, version: '6', when: WHEN_INIT, tag: '0000_init', breakpoints: true },
          { idx: 1, version: '6', when: WHEN_SEED, tag: '0001_seed', breakpoints: true },
          {
            idx: 2,
            version: '6',
            when: WHEN_LATER,
            tag: '0002_chat_domain',
            breakpoints: true
          }
        ]
      })
    )

    const db = openDb(dbPath)
    db.exec(INIT_SQL)

    expect(adoptBaseline(db, migrationsFolder)).toBe(2)
    const adopted = readRecords(db).map(function (row) {
      return row.hash
    })
    expect(adopted).not.toContain(createHash('sha256').update(laterSql).digest('hex'))
  })

  it('没有 journal 时不做任何事', function () {
    const db = openDb(dbPath)
    db.exec(INIT_SQL)
    rmSync(join(migrationsFolder, 'meta'), { recursive: true, force: true })
    expect(adoptBaseline(db, migrationsFolder)).toBe(0)
  })
})
