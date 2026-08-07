import path from 'node:path'
import type { ChecksumKind } from './config.ts'
import type { PrepareContext } from './command.ts'
import { hashSha256 } from './file.ts'
import { log } from './log.ts'

function parseSha256FromChecksum(
  text: string,
  archiveName: string,
  kind: ChecksumKind
): string | null {
  const lines = text
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim()
    })
    .filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^([a-fA-F0-9]{64})\s+\*?(\S+)$/)
    if (!match) continue
    const hash = match[1].toLowerCase()
    const name = path.basename(match[2])
    if (kind === 'file' || name === archiveName) return hash
  }

  if (kind === 'file' && lines.length === 1) {
    const only = lines[0].match(/^([a-fA-F0-9]{64})\b/)
    if (only) return only[1].toLowerCase()
  }

  return null
}

function assertFileMatchesHash(filePath: string, expected: string, label: string): void {
  const actual = hashSha256(filePath)
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for ${label}: expected ${expected} got ${actual}`)
  }
}

function assertArchiveMatchesChecksum(
  ctx: PrepareContext,
  archivePath: string,
  archiveName: string,
  checksumText: string,
  kind: ChecksumKind
): void {
  const expected = parseSha256FromChecksum(checksumText, archiveName, kind)
  if (!expected) {
    const message = `无法从校验文件解析 ${archiveName} 的 SHA-256`
    if (ctx.isStrict) throw new Error(message)
    log.warn(message)
    return
  }
  assertFileMatchesHash(archivePath, expected, archiveName)
  log.success(`校验通过 ${archiveName}`)
}

export {
  assertArchiveMatchesChecksum,
  assertFileMatchesHash,
  parseSha256FromChecksum
}
