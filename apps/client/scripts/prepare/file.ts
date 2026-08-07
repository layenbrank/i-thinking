import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

/** 存在且 size > 0。 */
function hasFilledFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0
  } catch {
    return false
  }
}

/** 幂等删除文件。 */
function removeFile(filePath: string): void {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true })
}

function copyFile(src: string, dest: string): void {
  ensureDir(path.dirname(dest))
  fs.copyFileSync(src, dest)
}

/** 计算文件 SHA-256（小写 hex）。 */
function hashSha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

/**
 * 单次 BFS：按 candidates 优先级返回第一个命中文件。
 */
function findPreferredFile(rootDir: string, candidates: string[]): string | null {
  const rank = new Map<string, number>()
  for (let i = 0; i < candidates.length; i += 1) {
    rank.set(candidates[i].toLowerCase(), i)
  }

  let bestPath: string | null = null
  let bestRank = Number.POSITIVE_INFINITY
  const queue = [rootDir]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(full)
        continue
      }
      if (!entry.isFile()) continue

      const matched = rank.get(entry.name.toLowerCase())
      if (matched === undefined || matched >= bestRank) continue
      bestRank = matched
      bestPath = full
      if (bestRank === 0) return bestPath
    }
  }

  return bestPath
}

function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8')
}

function writeTextFile(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, content, 'utf8')
}

function hasPath(filePath: string): boolean {
  return fs.existsSync(filePath)
}

function findFileSize(filePath: string): number {
  return fs.statSync(filePath).size
}

export {
  copyFile,
  ensureDir,
  findFileSize,
  findPreferredFile,
  hasFilledFile,
  hasPath,
  hashSha256,
  readTextFile,
  removeFile,
  writeTextFile
}
