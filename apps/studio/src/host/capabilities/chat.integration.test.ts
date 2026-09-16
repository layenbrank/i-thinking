/**
 * Chat 域集成校验：真实 better-sqlite3（Electron ABI）+ 真实迁移文件。
 *
 * 与 database.integration.test.ts 同一路径（普通 Node 跑不了 better-sqlite3）：
 *
 *   pnpm --filter @i-thinking/studio test:db
 *
 * 覆盖迁移落地后的三件 schema 语义：
 *   1. chat 三表齐备（旧 ai 域已不存在）
 *   2. 会话 → 消息级联；消息的分支自引用（parentID）级联
 *   3. provider 被删时会话保留、默认 provider 置空（on delete set null）
 */
import type { Database as SqliteHandle } from 'better-sqlite3'
import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it } from 'vitest'

// 本文件在 src/host/capabilities/ 下，要上溯三层才到包根（apps/studio）
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const MIGRATIONS_FOLDER = join(PACKAGE_ROOT, 'drizzle', 'migrations')

const handles: SqliteHandle[] = []
const tempDirs: string[] = []

function openDb(): SqliteHandle {
  const dir = mkdtempSync(join(tmpdir(), 'studio-chat-db-'))
  tempDirs.push(dir)
  const db = new Database(join(dir, 'i-thinking.db'))
  // 与 src/plugins/database.ts 的连接 pragma 保持一致（外键必须显式打开）
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('foreign_keys = ON')

  migrate(drizzle({ client: db }), { migrationsFolder: MIGRATIONS_FOLDER })

  handles.push(db)
  return db
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

function count(db: SqliteHandle, table: string): number {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM "${table}"`).get() as { count: number }
  return row.count
}

function insertProvider(db: SqliteHandle, id: string) {
  const now = Date.now()
  db.prepare(
    'INSERT INTO "chatProvider" ("id","kind","name","baseUrl","models","model","enabled","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?,?,?)'
  ).run(id, 'openai', '本地 Ollama', null, '["qwen3:8b"]', 'qwen3:8b', 1, now, now)
}

function insertSession(db: SqliteHandle, id: string, providerID: string | null) {
  const now = Date.now()
  db.prepare(
    'INSERT INTO "chatSession" ("id","title","pinned","providerID","createdAt","updatedAt") VALUES (?,?,?,?,?,?)'
  ).run(id, '会话', 0, providerID, now, now)
}

function insertMessage(db: SqliteHandle, id: string, sessionID: string, parentID: string | null) {
  const now = Date.now()
  db.prepare(
    'INSERT INTO "chatMessage" ("id","sessionID","parentID","format","content","createdAt","updatedAt") VALUES (?,?,?,?,?,?,?)'
  ).run(id, sessionID, parentID, 'ai-sdk/v6', '{}', now, now)
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

describe('chat 域（真实引擎 better-sqlite3）', function () {
  it('迁移后 chat 三表齐备，旧 ai 域已移除', function () {
    const db = openDb()
    const tables = tableNames(db)

    expect(tables).toContain('chatProvider')
    expect(tables).toContain('chatSession')
    expect(tables).toContain('chatMessage')
    expect(
      tables.filter(function (name) {
        return name.startsWith('ai')
      })
    ).toEqual([])
  })

  it('会话级联删消息；分支自引用级联删后继', function () {
    const db = openDb()
    insertSession(db, 'session-1', null)
    insertMessage(db, 'message-1', 'session-1', null)
    insertMessage(db, 'message-2', 'session-1', 'message-1')
    insertMessage(db, 'message-3', 'session-1', 'message-2')
    expect(count(db, 'chatMessage')).toBe(3)

    // 删中间节点 → 后继分支一并删除，兄弟分支不受影响
    insertMessage(db, 'message-branch', 'session-1', 'message-1')
    db.prepare('DELETE FROM "chatMessage" WHERE "id" = ?').run('message-2')
    expect(count(db, 'chatMessage')).toBe(2)
    expect(
      db.prepare('SELECT "parentID" FROM "chatMessage" WHERE "id" = ?').get('message-branch')
    ).toEqual({ parentID: 'message-1' })

    // 删会话 → 余下消息级联清空
    db.prepare('DELETE FROM "chatSession" WHERE "id" = ?').run('session-1')
    expect(count(db, 'chatMessage')).toBe(0)
  })

  it('provider 被删：会话保留、默认 provider 置空', function () {
    const db = openDb()
    insertProvider(db, 'provider-1')
    insertSession(db, 'session-1', 'provider-1')

    db.prepare('DELETE FROM "chatProvider" WHERE "id" = ?').run('provider-1')

    expect(count(db, 'chatSession')).toBe(1)
    expect(
      db.prepare('SELECT "providerID" FROM "chatSession" WHERE "id" = ?').get('session-1')
    ).toEqual({ providerID: null })
  })
})
