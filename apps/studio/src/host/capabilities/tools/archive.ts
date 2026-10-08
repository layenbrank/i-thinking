import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

/**
 * 解压 + 在归档里找文件。
 *
 * 与 CLI（`scripts/commands/features/sidecar/infra/extract.ts`）同源、不共用：那边属仓库
 * 工具链（构建期跑一次、失败就抛），这边属运行时（要落到用户目录、要能重试）。两边都坚持
 * 「只用系统工具」这条约束 —— 不引 adm-zip / npm tar / lzma-native：
 *
 * 1. `tar -xf`（Windows 自带 bsdtar 通常认得 zip / tar.gz / tar.xz）
 * 2. zip 回退：Windows 用 `Expand-Archive`，其余用 `unzip`
 */

function runCommand(command: string, args: string[]): { ok: boolean; detail: string } {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  return {
    ok: result.status === 0,
    detail: result.stderr || result.stdout || String(result.status)
  }
}

function findArchiveKind(archivePath: string): string | null {
  const lower = archivePath.toLowerCase()
  for (const ext of ['.tar.bz2', '.tbz2', '.tbz', '.tar.xz', '.txz', '.tar.gz', '.tgz', '.zip']) {
    if (lower.endsWith(ext)) {
      return ext
    }
  }
  return null
}

function extractArchive(archivePath: string, extractDir: string): void {
  const kind = findArchiveKind(archivePath)
  if (!kind) {
    throw new Error(`不支持的归档格式：${path.basename(archivePath)}`)
  }

  rmSync(extractDir, { recursive: true, force: true })
  mkdirSync(extractDir, { recursive: true })

  const tar = runCommand('tar', ['-xf', archivePath, '-C', extractDir])
  if (tar.ok) {
    return
  }

  if (kind !== '.zip') {
    throw new Error(`tar 解压失败：${tar.detail}`)
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
    throw new Error(`解压失败（tar: ${tar.detail}；Expand-Archive: ${ps.detail}）`)
  }

  const unzip = runCommand('unzip', ['-o', archivePath, '-d', extractDir])
  if (!unzip.ok) {
    throw new Error(`unzip 解压失败：${unzip.detail}`)
  }
}

/** 归档里按文件名（basename）找；各家的目录层级都不一样，不猜路径 */
function findFileInTree(root: string, fileName: string): string | undefined {
  const queue = [root]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current || !existsSync(current)) {
      continue
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

export { extractArchive, findArchiveKind, findFileInTree }
