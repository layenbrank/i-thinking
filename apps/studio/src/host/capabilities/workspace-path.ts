import { existsSync, readdirSync, readFileSync, realpathSync, statSync, type Dirent } from 'node:fs'
import path from 'node:path'

import { IpcError } from '../../shared/ipc/error'

/**
 * 工作区路径的纯逻辑：根约束、忽略规则、目录列举与名字检索。
 *
 * 与 DB 无关，所以能被单测直接覆盖（service 只负责「查根 + 写库」）。
 * 约束的核心是 `resolveInside` —— 渲染进程永远拿不到根外的绝对路径。
 */

/** 目录遍历一律跳过这些（agent 不该扫进去） */
export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.turbo',
  '.vite',
  'dist',
  'build',
  'coverage',
  'out',
  'target',
  '.next'
])

export const MAX_ENTRIES = 500
export const MAX_SEARCH_HITS = 200
export const DEFAULT_SEARCH_LIMIT = 50
/** 单文件读取上限：超过就拒绝，避免把渲染进程拖死 */
export const MAX_FILE_BYTES = 2 * 1024 * 1024
const MAX_SEARCH_DEPTH = 8
const MAX_SEARCH_DIRS = 2000

function isInside(rootReal: string, target: string): boolean {
  const normalizedRoot = rootReal.endsWith(path.sep) ? rootReal : rootReal + path.sep
  return target === rootReal || target.startsWith(normalizedRoot)
}

/** 逐级向上找已存在的祖先（写入新文件时目标本身还不存在） */
function findExistingAncestor(target: string): string | null {
  let current = target
  while (!existsSync(current)) {
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
  return current
}

/**
 * 把相对路径解析成根内的绝对路径。
 *
 * 三道防线：拒绝绝对路径与 `..` 逃逸 → 以真实根路径为基准再比一次前缀 →
 * 目标最近的已存在祖先解析真实路径后仍须在根内（挡符号链接逃逸）。
 * 任何一步不合法都抛 `WORKSPACE_PATH_ESCAPE`。
 */
export function resolveInside(rootPath: string, relative: string): string {
  if (path.isAbsolute(relative)) {
    throw new IpcError('WORKSPACE_PATH_ESCAPE', `只接受相对路径: ${relative}`)
  }

  const rootReal = realpathSync(rootPath)
  const target = path.resolve(rootReal, relative)
  if (!isInside(rootReal, target)) {
    throw new IpcError('WORKSPACE_PATH_ESCAPE', `路径越出工作区根: ${relative}`)
  }

  const anchor = findExistingAncestor(target)
  if (anchor && !isInside(rootReal, realpathSync(anchor))) {
    throw new IpcError('WORKSPACE_PATH_ESCAPE', `路径经符号链接逃出根外: ${relative}`)
  }

  return target
}

/** 隐藏项（.env.example 例外，它是常见的模板文件）与忽略目录 */
export function isIgnoredEntry(entry: Dirent): boolean {
  if (entry.name.startsWith('.') && entry.name !== '.env.example') return true
  return entry.isDirectory() && IGNORED_DIRS.has(entry.name)
}

export interface DirectoryEntry {
  name: string
  kind: 'file' | 'dir'
  relative: string
}

/** 列一层目录（不递归）；目录在前，各自按名字排序 */
export function listEntries(rootPath: string, relative = ''): DirectoryEntry[] {
  const target = resolveInside(rootPath, relative)

  if (!existsSync(target)) {
    throw new IpcError('WORKSPACE_ENTRY_NOT_FOUND', `目录不存在: ${relative}`)
  }

  const entries: DirectoryEntry[] = []
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entries.length >= MAX_ENTRIES) break
    if (isIgnoredEntry(entry)) continue

    entries.push({
      name: entry.name,
      kind: entry.isDirectory() ? 'dir' : 'file',
      relative: toRelative(rootPath, path.join(target, entry.name))
    })
  }

  return entries.sort(function (a, b) {
    if (a.kind !== b.kind) return a.kind === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
}

export interface SearchEntry {
  name: string
  relative: string
}

/**
 * 按文件名检索（有界 BFS）：限深度、限访问目录数、限命中数 ——
 * 不受控的全盘扫描会卡住主进程。
 */
export function searchEntries(rootPath: string, query: string, limit?: number): SearchEntry[] {
  const needle = query.trim().toLowerCase()
  const max = Math.min(limit ?? DEFAULT_SEARCH_LIMIT, MAX_SEARCH_HITS)
  if (!needle) return []

  const hits: SearchEntry[] = []
  const queue: Array<{ absolute: string; depth: number }> = [{ absolute: rootPath, depth: 0 }]
  let visited = 0

  while (queue.length > 0 && hits.length < max && visited < MAX_SEARCH_DIRS) {
    const current = queue.shift()
    if (!current) break
    visited += 1

    let entries: Dirent[]
    try {
      entries = readdirSync(current.absolute, { withFileTypes: true })
    } catch (error) {
      console.warn('[workspace] 目录不可读，检索跳过', current.absolute, error)
      continue
    }

    for (const entry of entries) {
      if (isIgnoredEntry(entry)) continue

      const absolute = path.join(current.absolute, entry.name)
      if (entry.isDirectory()) {
        if (current.depth < MAX_SEARCH_DEPTH) {
          queue.push({ absolute, depth: current.depth + 1 })
        }
        continue
      }

      if (entry.name.toLowerCase().includes(needle)) {
        hits.push({ name: entry.name, relative: toRelative(rootPath, absolute) })
        if (hits.length >= max) break
      }
    }
  }

  return hits
}

/** 读取文本文件；超限与目录都拒绝 */
export function readTextFile(rootPath: string, relative: string): string {
  const target = resolveInside(rootPath, relative)

  if (!existsSync(target)) {
    throw new IpcError('WORKSPACE_ENTRY_NOT_FOUND', `文件不存在: ${relative}`)
  }

  const stats = statSync(target)
  if (!stats.isFile()) {
    throw new IpcError('WORKSPACE_ENTRY_NOT_FOUND', `不是文件: ${relative}`)
  }
  if (stats.size > MAX_FILE_BYTES) {
    throw new IpcError(
      'WORKSPACE_FILE_TOO_LARGE',
      `文件超过 ${Math.round(MAX_FILE_BYTES / 1024)}KB，暂不读取`
    )
  }

  return readFileSync(target, 'utf8')
}

function toRelative(rootPath: string, absolute: string): string {
  return path.relative(realpathSync(rootPath), absolute).split(path.sep).join('/')
}
