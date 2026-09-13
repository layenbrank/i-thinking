import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * 从 Tauri 版（sea-orm）的迁移里抽取种子 SQL，生成一个 Drizzle 迁移，
 * 保证「同实现的两版」初始数据完全一致（studio 自己建表，不依赖 client）。
 *
 *   node scripts/sync-seed.mjs            # 写入 drizzle/migrations/<idx>_seed.sql
 *
 * 源：apps/client/src-tauri/crates/database/src/migrations/migrations_v001.rs 的
 *     `INSERT OR IGNORE ...` 语句（countdown / mirror / magneticTile 种子）。
 * 目标迁移用 INSERT OR IGNORE，可重复执行；已被既有库（Tauri/client 版建过）占用时
 * 由 src/plugins/database-migrate.ts 的 adoptBaseline() 采纳基线后跳过。
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const PACKAGE_ROOT = resolve(HERE, '..')
const SOURCE = resolve(
  PACKAGE_ROOT,
  '..',
  'client',
  'src-tauri',
  'crates',
  'database',
  'src',
  'migrations',
  'migrations_v001.rs'
)

function findStatements(source) {
  // 原始字符串 r##"..."## 里含 JSON 的双引号（如 {"color":"#fff"}），
  // 必须先抽走再匹配常规字符串，否则会误匹配并被内层引号截断
  const rawMatches = Array.from(source.matchAll(/r##"([\s\S]*?)"##/g))
  let rest = source
  rawMatches.forEach(function (match) {
    rest = rest.replace(match[0], '')
  })
  const raw = rawMatches
    .map(function (match) {
      return match[1]
    })
    .filter(function (sql) {
      return sql.includes('INSERT OR IGNORE')
    })

  // Rust 行尾续行 `\` 会吞掉换行与其后的缩进，先还原成单行再匹配常规字符串
  const joined = rest.replace(/\\\r?\n[ \t]*/g, '')
  const normal = Array.from(
    joined.matchAll(/"([^"]*INSERT OR IGNORE[\s\S]*?)"/g),
    function (match) {
      return match[1]
    }
  )

  return [...normal, ...raw].map(function (sql) {
    const trimmed = sql.trim()
    return trimmed.endsWith(';') ? trimmed : `${trimmed};`
  })
}

const statements = findStatements(readFileSync(SOURCE, 'utf8'))
if (statements.length === 0) {
  throw new Error(`未从 ${SOURCE} 抽取到 INSERT OR IGNORE 语句`)
}

const counts = {}
statements.forEach(function (sql) {
  const table = /INSERT OR IGNORE INTO\s+(\w+)/.exec(sql)?.[1] ?? 'unknown'
  counts[table] = (counts[table] ?? 0) + 1
})

const migrationsDir = join(PACKAGE_ROOT, 'drizzle', 'migrations')

/** 目标：drizzle-kit 生成的空 custom 迁移（<idx>_seed.sql）；本脚本只填充内容 */
function findSeedTarget() {
  if (!existsSync(migrationsDir)) return null
  const candidates = readdirSync(migrationsDir)
    .filter(function (name) {
      return /^\d+_seed\.sql$/.test(name)
    })
    .sort()
  return candidates.length > 0 ? join(migrationsDir, candidates[candidates.length - 1]) : null
}

const target = findSeedTarget()
if (!target) {
  throw new Error(
    '未找到种子迁移文件；请先执行：pnpm exec drizzle-kit generate --custom --name=seed'
  )
}

const content = [
  '-- 由 scripts/sync-seed.mjs 从 Tauri 版迁移抽取，请勿手改。',
  '-- 源: apps/client/src-tauri/crates/database/src/migrations/migrations_v001.rs',
  '',
  // drizzle 的 migrator 以 statement-breakpoint 切分并逐条执行
  statements.join('\n--> statement-breakpoint\n'),
  ''
].join('\n')

writeFileSync(target, content)

console.log(`已写入 ${target}`)
console.log(
  `语句数 ${statements.length}：${Object.entries(counts)
    .map(function ([table, count]) {
      return `${table}=${count}`
    })
    .join(', ')}`
)
