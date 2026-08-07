import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import type { PrepareContext } from './command.ts'
import type { RemoteAsset, StageCopy } from './config.ts'
import { BINARIES_DIR, CACHE_DIR } from './config.ts'
import { copyFile, ensureDir, findPreferredFile } from './file.ts'
import { log } from './log.ts'
import { ensureCachedArchive } from './remote.ts'

function runCommand(command: string, args: string[]): { ok: boolean; detail: string } {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  const detail = result.stderr || result.stdout || String(result.status)
  return { ok: result.status === 0, detail }
}

function extractArchive(archivePath: string, extractDir: string): void {
  fs.rmSync(extractDir, { recursive: true, force: true })
  ensureDir(extractDir)

  const tar = runCommand('tar', ['-xf', archivePath, '-C', extractDir])
  if (tar.ok) return

  const lower = archivePath.toLowerCase()
  const isZip = lower.endsWith('.zip')
  const isTar = lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.tar.xz')

  if (!isZip && !isTar) {
    throw new Error(`unsupported archive: ${archivePath}`)
  }

  if (isTar) {
    throw new Error(`tar extract failed: ${tar.detail}`)
  }

  if (process.platform === 'win32') {
    const escapedArchive = archivePath.replace(/'/g, "''")
    const escapedDest = extractDir.replace(/'/g, "''")
    const ps = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedDest}' -Force`
    ])
    if (ps.ok) return
    throw new Error(`zip extract failed (tar: ${tar.detail}; Expand-Archive: ${ps.detail})`)
  }

  const unzip = runCommand('unzip', ['-o', archivePath, '-d', extractDir])
  if (!unzip.ok) throw new Error(`unzip failed: ${unzip.detail}`)
}

/**
 * 解压后扁平化：按 basename 保留 keepNames，提升到 extract 根目录。
 */
function flattenExtractDir(extractDir: string, keepNames: string[]): void {
  const keep = new Set(
    keepNames.map(function (name) {
      return name.toLowerCase()
    })
  )
  const matched: string[] = []

  function walk(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
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
  }

  walk(extractDir)

  const staged = path.join(extractDir, '.flatten-staging')
  fs.rmSync(staged, { recursive: true, force: true })
  ensureDir(staged)

  for (const file of matched) {
    copyFile(file, path.join(staged, path.basename(file)))
  }

  for (const entry of fs.readdirSync(extractDir, { withFileTypes: true })) {
    const full = path.join(extractDir, entry.name)
    if (full === staged) continue
    fs.rmSync(full, { recursive: true, force: true })
  }

  for (const name of fs.readdirSync(staged)) {
    fs.renameSync(path.join(staged, name), path.join(extractDir, name))
  }
  fs.rmSync(staged, { recursive: true, force: true })
}

async function stageFromArchive(
  ctx: PrepareContext,
  asset: RemoteAsset,
  extractKey: string,
  copies: StageCopy[],
  keepNames?: string[]
): Promise<void> {
  const archivePath = await ensureCachedArchive(ctx, asset)
  const extractDir = path.join(CACHE_DIR, 'extract', extractKey)
  extractArchive(archivePath, extractDir)

  const flattenKeep =
    keepNames ??
    copies.flatMap(function (copy) {
      return copy.candidates
    })
  flattenExtractDir(extractDir, flattenKeep)

  ensureDir(BINARIES_DIR)
  for (const copy of copies) {
    const src = findPreferredFile(extractDir, copy.candidates)
    if (!src) {
      throw new Error(`archive missing ${copy.candidates.join('|')}: ${asset.archiveName}`)
    }
    if (path.basename(src).toLowerCase() !== copy.candidates[0].toLowerCase()) {
      throw new Error(`解压命中文件名不符: got ${path.basename(src)}, want ${copy.candidates[0]}`)
    }
    copyFile(src, copy.dest)
    log.success(`${src} -> ${copy.dest}`)
  }
}

export { extractArchive, flattenExtractDir, stageFromArchive }
