import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

/**
 * Prisma → Drizzle 替换的 schema 一致性校验（一次性安全闸，见 docs/prisma-to-drizzle.md §3.3）。
 *
 *   库 A：用现有 Prisma 迁移生成（等价于 Tauri 版 DDL，除已记录差异）
 *   库 B：用 Drizzle 迁移生成
 *   逐表 diff：列（名/类型/notnull/默认值/PK）、外键（含动作）、索引（列集合，忽略索引名）
 *
 * 允许的差异写在 ALLOWED 里；出现其它差异 → 退出码 1。
 *
 *   node scripts/check-schema-parity.mjs
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

/**
 * 已记录、可接受的差异（前缀匹配）。类型名层面的等价差异已在 normalizeType 里归一化，
 * 不会出现在这里。
 */
const ALLOWED = [
  // 与 Rust（Tauri 版）一致：只建索引，不建 FK —— 加 FK 会改变"删除镜像"的语义
  'magneticTile 外键: 仅参照库有 mirrorID',
  // Rust 没有这两个索引（Prisma 版额外加的）
  'magneticTile 索引: 仅参照库有 (collectionID)',
  'magneticTile 索引: 仅参照库有 (component)',
  // Auth 是 studio 自有表（Tauri 版没有、无历史数据）：时间由应用显式写入，不设 DB 默认值
  'Auth 列 createdAt: '
]

/**
 * 类型名归一化：SQLite 是动态类型，"类型名"只是亲和性提示。
 * - BOOLEAN / BIGINT → INTEGER：同为 INTEGER 亲和（布尔存 0/1、i64 存整数）
 * - Auth 的 DATETIME → INTEGER：studio 自有表，Drizzle 用毫秒整数
 */
function normalizeType(table, type) {
  const upper = (type ?? '').toUpperCase()
  if (upper === 'BOOLEAN' || upper === 'BIGINT') return 'INTEGER'
  if (upper === 'DATETIME' && table === 'Auth') return 'INTEGER'
  return upper
}

function openDb(file) {
  rmSync(file, { force: true })
  return new DatabaseSync(file)
}

/**
 * 库 A：v1 参照 schema（冻结快照，等价于 Tauri/sea-orm 的 migrations_v001.rs）。
 * Prisma 迁移已随替换删除，参照改为 scripts/fixtures/legacy-v1.sql。
 */
function buildReferenceDb(file) {
  const db = openDb(file)
  db.exec(
    readFileSync(join(ROOT, 'scripts', 'fixtures', 'legacy-v1.sql'), 'utf8')
  )
  return db
}

/** 库 B：执行 Drizzle 迁移（以 `--> statement-breakpoint` 分隔语句） */
function buildDrizzleDb(file) {
  const db = openDb(file)
  const dir = join(ROOT, 'drizzle', 'migrations')
  readdirSync(dir)
    .filter(function (name) {
      return name.endsWith('.sql')
    })
    .sort()
    .forEach(function (name) {
      readFileSync(join(dir, name), 'utf8')
        .split('--> statement-breakpoint')
        .filter(function (sql) {
          return sql.trim().length > 0
        })
        .forEach(function (sql) {
          db.exec(sql)
        })
    })
  return db
}

const IGNORED_TABLES = /^(sqlite_|_prisma|__drizzle)/

function findTables(db) {
  return db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name"
    )
    .all()
    .map(function (row) {
      return row.name
    })
    .filter(function (name) {
      return !IGNORED_TABLES.test(name)
    })
}

function readColumns(db, table) {
  const map = new Map()
  db.prepare(`PRAGMA table_info("${table}")`)
    .all()
    .forEach(function (row) {
      map.set(row.name, {
        type: normalizeType(table, row.type),
        notNull: Number(row.notnull),
        default: row.dflt_value === null ? null : String(row.dflt_value),
        pk: Number(row.pk)
      })
    })
  return map
}

function readForeignKeys(db, table) {
  return db
    .prepare(`PRAGMA foreign_key_list("${table}")`)
    .all()
    .map(function (row) {
      return `${row.from} -> ${row.table}.${row.to} [onDelete=${String(
        row.on_delete
      ).toUpperCase()} onUpdate=${String(row.on_update).toUpperCase()}]`
    })
    .sort()
}

/** 索引只比"列集合 + 唯一性"，忽略索引名 */
function readIndexKeys(db, table) {
  const keys = []
  db.prepare(`PRAGMA index_list("${table}")`)
    .all()
    .forEach(function (index) {
      if (String(index.origin) === 'pk') return
      const columns = db
        .prepare(`PRAGMA index_info("${index.name}")`)
        .all()
        .map(function (row) {
          return row.name
        })
        .filter(Boolean)
        .sort()
        .join(',')
      keys.push(`(${columns})${Number(index.unique) === 1 ? ' unique' : ''}`)
    })
  return Array.from(new Set(keys)).sort()
}

function diffMap(label, a, b) {
  const out = []
  const keys = Array.from(new Set([...a.keys(), ...b.keys()])).sort()
  keys.forEach(function (key) {
    const left = JSON.stringify(a.get(key))
    const right = JSON.stringify(b.get(key))
    if (left !== right)
      out.push(`${label} ${key}: 参照=${left} Drizzle=${right}`)
  })
  return out
}

function diffList(label, a, b) {
  const onlyLeft = a.filter(function (item) {
    return !b.includes(item)
  })
  const onlyRight = b.filter(function (item) {
    return !a.includes(item)
  })
  const out = []
  onlyLeft.forEach(function (item) {
    out.push(`${label}: 仅参照库有 ${item}`)
  })
  onlyRight.forEach(function (item) {
    out.push(`${label}: 仅 Drizzle 有 ${item}`)
  })
  return out
}

const workDir = mkdtempSync(join(tmpdir(), 'schema-parity-'))
const dbA = buildReferenceDb(join(workDir, 'reference.db'))
const dbB = buildDrizzleDb(join(workDir, 'drizzle.db'))

const tablesA = findTables(dbA)
const tablesB = findTables(dbB)
const differences = []

diffList('表', tablesA, tablesB).forEach(function (message) {
  differences.push(message)
})

tablesA
  .filter(function (name) {
    return tablesB.includes(name)
  })
  .forEach(function (table) {
    diffMap(
      `${table} 列`,
      readColumns(dbA, table),
      readColumns(dbB, table)
    ).forEach(function (message) {
      differences.push(message)
    })
    diffList(
      `${table} 外键`,
      readForeignKeys(dbA, table),
      readForeignKeys(dbB, table)
    ).forEach(function (message) {
      differences.push(message)
    })
    diffList(
      `${table} 索引`,
      readIndexKeys(dbA, table),
      readIndexKeys(dbB, table)
    ).forEach(function (message) {
      differences.push(message)
    })
  })

dbA.close()
dbB.close()
rmSync(workDir, { recursive: true, force: true })

console.log(
  `库 A（v1 参照快照）表数 ${tablesA.length} / 库 B（Drizzle 迁移）表数 ${tablesB.length}`
)

const allowed = differences.filter(function (message) {
  return ALLOWED.some(function (prefix) {
    return message.startsWith(prefix)
  })
})
const unexpected = differences.filter(function (message) {
  return !ALLOWED.some(function (prefix) {
    return message.startsWith(prefix)
  })
})

console.log(
  `差异 ${differences.length} 条：可接受 ${allowed.length}，未记录 ${unexpected.length}`
)
allowed.forEach(function (message) {
  console.log(`  ~ ${message}`)
})

if (unexpected.length > 0) {
  console.error('存在未记录的差异：')
  unexpected.forEach(function (message) {
    console.error(`  ! ${message}`)
  })
  process.exit(1)
}

console.log('✅ 与 v1 参照快照一致（差异均已在 ALLOWED 中记录并说明原因）')
