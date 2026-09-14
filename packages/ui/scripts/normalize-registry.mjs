/**
 * 把 shadcn CLI 的产物搬到本包的真实布局里。
 *
 * 为什么需要：本包**故意不声明 tsconfig `paths`**（见 README：共享包内部一律相对导入，
 * 残留 `@/` 要在 tsc 就报错）。而 shadcn CLI 靠 tsconfig 的 `paths` 解析 `components.json`
 * 里的 `@/…` aliases —— 解析不到时它把 aliases 当成相对路径，于是文件被写到字面量目录
 * `@/components/…`、`@/hooks/…`，导入也留着 `@/…`。
 *
 * 本脚本做三件事（幂等）：
 *   1. `@/**` → `src/**`；目标已存在则保留现有（已归一化的）文件，丢弃 CLI 的同名副本
 *   2. `@/…` 导入 → 相对路径
 *   3. 去掉 `"use client"` 指令；清掉空目录
 *
 *   pnpm --filter @i-thinking/ui registry:add @assistant-ui/thread   # CLI 装
 *   pnpm --filter @i-thinking/ui registry:fix                        # 本脚本
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MIRROR_DIR = join(PACKAGE_ROOT, '@')
const SOURCE_DIR = join(PACKAGE_ROOT, 'src')

const USE_CLIENT = /^\s*(?:"use client"|'use client');?\s*$/gm
/** 命中 `from '@/…'` 或副作用式 `import '@/…'`（单双引号都算） */
const ALIAS_IMPORT = /(from\s+['"])(@\/[^'"]+)(['"])|(import\s+['"])(@\/[^'"]+)(['"])/

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(function (entry) {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

/** `@/a/b` 从当前文件位置改写为相对说明符（保留原扩展名写法） */
function toRelative(specifier, fromFile) {
  const target = join(SOURCE_DIR, specifier.slice('@/'.length))
  const relativePath = relative(dirname(fromFile), target).split(sep).join('/')
  return relativePath.startsWith('.') ? relativePath : `./${relativePath}`
}

function rewriteImports(file) {
  const source = readFileSync(file, 'utf8')
  const rewritten = source
    .replace(USE_CLIENT, '')
    .replace(/(from\s+['"])(@\/[^'"]+)(['"])/g, function (_match, head, specifier, tail) {
      return `${head}${toRelative(specifier, file)}${tail}`
    })
    .replace(/(import\s+['"])(@\/[^'"]+)(['"])/g, function (_match, head, specifier, tail) {
      return `${head}${toRelative(specifier, file)}${tail}`
    })

  if (rewritten !== source) writeFileSync(file, rewritten)
}

function pruneEmptyDirs(dir) {
  if (!existsSync(dir)) return
  readdirSync(dir, { withFileTypes: true }).forEach(function (entry) {
    if (entry.isDirectory()) pruneEmptyDirs(join(dir, entry.name))
  })
  if (readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true })
}

const moved = []
const skipped = []

if (existsSync(MIRROR_DIR)) {
  walk(MIRROR_DIR).forEach(function (file) {
    const target = join(SOURCE_DIR, relative(MIRROR_DIR, file))
    if (existsSync(target)) {
      skipped.push(relative(PACKAGE_ROOT, target))
      return
    }
    mkdirSync(dirname(target), { recursive: true })
    renameSync(file, target)
    moved.push(target)
  })
}

// 已移入的文件 + 任何遗留 `@/` 导入（脚本可重复执行/可从半完成状态恢复）
const touched = new Set(moved)
walk(SOURCE_DIR).forEach(function (file) {
  const source = readFileSync(file, 'utf8')
  if (ALIAS_IMPORT.test(source) || /["']use client["']/.test(source)) touched.add(file)
})
touched.forEach(rewriteImports)

pruneEmptyDirs(MIRROR_DIR)
if (existsSync(MIRROR_DIR) && statSync(MIRROR_DIR).isDirectory() && readdirSync(MIRROR_DIR).length === 0) {
  rmSync(MIRROR_DIR, { recursive: true, force: true })
}

function toLines(files) {
  return files
    .map(function (file) {
      return `  ${relative(PACKAGE_ROOT, file)}`
    })
    .join('\n')
}

console.log(`移入 ${moved.length} 个文件：\n${toLines(moved)}`)
if (skipped.length > 0) {
  console.log(`保留本包既有版本（丢弃 CLI 副本）${skipped.length} 个：\n${toLines(skipped)}`)
}
console.log(`规范化 ${touched.size} 个文件的导入/指令`)
