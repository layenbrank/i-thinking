import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { TOOLS } from '../tools/catalog.ts'

import { CHECKSUMS_FILE } from './constants.ts'
import { hashFile } from './hash.ts'
import { findLockPins, hasToolPin, parseToolsLock } from './lock.ts'
import { findPlatformKey } from './platform.ts'

interface StagingChecksums {
  platform: string
  files: Record<string, string>
}

interface StageTarget {
  id: string
  findStagedDir(platformKey: string): string
  /** 拷贝到落盘目录时可选重映射文件名 */
  mapFileName?(fileName: string): string
}

function writeChecksums(dir: string, files: Record<string, string>, key: string): void {
  const payload: StagingChecksums = { platform: key, files }
  writeFileSync(path.join(dir, CHECKSUMS_FILE), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function parseStagingChecksums(stagedDir: string): StagingChecksums {
  const filePath = path.join(stagedDir, CHECKSUMS_FILE)
  if (!existsSync(filePath)) {
    throw new Error(`[stage] 缺少 ${filePath}；请先执行 sidecar bootstrap`)
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as StagingChecksums
}

async function stageVendoredTools(target: StageTarget, key = findPlatformKey()): Promise<void> {
  const lock = parseToolsLock()
  const destDir = target.findStagedDir(key)
  mkdirSync(destDir, { recursive: true })
  const hashes: Record<string, string> = {}

  for (const tool of Object.values(TOOLS)) {
    const pins = findLockPins(lock, tool.id)
    if (!pins || !hasToolPin(pins, key)) {
      if (tool.id === 'corex' || (target.id === 'client' && tool.id === 'goose')) {
        throw new Error(`[stage] 当前平台无 ${tool.id} 钉死版本: ${key}（应用=${target.id}）`)
      }
      continue
    }
    await tool.ensure(key)
    for (const src of tool.findRuntimeFiles(key)) {
      const rawName = path.basename(src)
      const fileName = target.mapFileName ? target.mapFileName(rawName) : rawName
      const dest = path.join(destDir, fileName)
      cpSync(src, dest)
      hashes[fileName] = hashFile(dest)
      console.log(`[stage:${target.id}] ${fileName}`)
    }
  }

  writeChecksums(destDir, hashes, key)
  console.log(
    `[stage:${target.id}] 已写入 ${CHECKSUMS_FILE}（${Object.keys(hashes).length} 个文件）→ ${destDir}`
  )
}

export type { StageTarget, StagingChecksums }
export { parseStagingChecksums, stageVendoredTools, writeChecksums }
