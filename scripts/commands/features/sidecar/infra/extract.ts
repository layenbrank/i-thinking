import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'

function runCommand(command: string, args: string[]): { ok: boolean; detail: string } {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  const detail = result.stderr || result.stdout || String(result.status)
  return { ok: result.status === 0, detail }
}

function ensureDir(dir: string): void {
  mkdirSync(dir, { recursive: true })
}

/**
 * 解压后扁平化：按 basename 保留 keepNames，提升到 extract 根目录。
 * （对齐已删的 apps/client/scripts/prepare/extract.ts）
 */
function flattenExtractDir(extractDir: string, keepNames: string[]): void {
  const keep = new Set(
    keepNames.map(function (name) {
      return name.toLowerCase()
    })
  )
  const matched: string[] = []

  function walk(dir: string): void {
    try {
      const entries = readdirSync(dir, { withFileTypes: true })
      for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          walk(full)
          continue
        }
        if (entry.isFile() && keep.has(entry.name.toLowerCase())) {
          matched.push(full)
        }
      }
    } catch {
      return
    }
  }

  walk(extractDir)

  const staged = path.join(extractDir, '.flatten-staging')
  rmSync(staged, { recursive: true, force: true })
  ensureDir(staged)

  for (const file of matched) {
    cpSync(file, path.join(staged, path.basename(file)))
  }

  for (const entry of readdirSync(extractDir, { withFileTypes: true })) {
    const full = path.join(extractDir, entry.name)
    if (full === staged) continue
    rmSync(full, { recursive: true, force: true })
  }

  for (const name of readdirSync(staged)) {
    renameSync(path.join(staged, name), path.join(extractDir, name))
  }
  rmSync(staged, { recursive: true, force: true })
}

function parseArchiveKind(archivePath: string): string {
  const lower = archivePath.toLowerCase()
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return '.tar.gz'
  }
  if (lower.endsWith('.tar.xz') || lower.endsWith('.txz')) {
    return '.tar.xz'
  }
  if (lower.endsWith('.zip')) {
    return '.zip'
  }
  throw new Error(`[extract] 不支持的归档: ${archivePath}`)
}

function parseArchiveExt(url: string): string {
  const lower = url.toLowerCase()
  if (lower.includes('.tar.xz') || lower.endsWith('.txz')) {
    return '.tar.xz'
  }
  if (lower.includes('.tar.gz') || lower.endsWith('.tgz')) {
    return '.tar.gz'
  }
  return path.extname(url) || '.zip'
}

/**
 * 仅系统工具解压（无 adm-zip / npm tar / lzma-native）：
 * 1. tar -xf（Windows bsdtar 通常可处理 zip / tar.gz / tar.xz）
 * 2. zip：Expand-Archive（win）或 unzip
 */
function extractArchive(archivePath: string, extractDir: string): void {
  rmSync(extractDir, { recursive: true, force: true })
  ensureDir(extractDir)

  const tar = runCommand('tar', ['-xf', archivePath, '-C', extractDir])
  if (tar.ok) {
    return
  }

  const lower = archivePath.toLowerCase()
  const isZip = lower.endsWith('.zip')
  const isTar =
    lower.endsWith('.tar.gz') ||
    lower.endsWith('.tgz') ||
    lower.endsWith('.tar.xz') ||
    lower.endsWith('.txz')

  if (!isZip && !isTar) {
    throw new Error(`[extract] 不支持的归档: ${archivePath}`)
  }

  if (isTar) {
    throw new Error(`[extract] tar 解压失败: ${tar.detail}`)
  }

  if (process.platform === 'win32') {
    const escapedArchive = archivePath.replace(/'/g, "''")
    const escapedDest = extractDir.replace(/'/g, "''")
    const ps = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedDest}' -Force`
    ])
    if (ps.ok) {
      return
    }
    throw new Error(
      `[extract] zip 解压失败（tar: ${tar.detail}; Expand-Archive: ${ps.detail}）`
    )
  }

  const unzip = runCommand('unzip', ['-o', archivePath, '-d', extractDir])
  if (!unzip.ok) {
    throw new Error(`[extract] unzip 失败: ${unzip.detail}`)
  }
}

function findFileInTree(root: string, fileName: string): string | undefined {
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || !existsSync(current)) {
      break
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name)
      if (entry.isFile() && entry.name === fileName) {
        return full
      }
      if (entry.isDirectory()) {
        queue.push(full)
      }
    }
  }
  return undefined
}

export { extractArchive, findFileInTree, flattenExtractDir, parseArchiveExt, parseArchiveKind }
