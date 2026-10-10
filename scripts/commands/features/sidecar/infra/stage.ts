import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { TOOLS } from '../tools/catalog.ts'

import { CHECKSUMS_FILE } from './constants.ts'
import { hashFile } from './hash.ts'
import { findLockPins, hasToolPin, isOnDemandPin, parseToolsLock } from './lock.ts'
import { findOnlineTool, stageOnlineTool } from './manifest.ts'
import { findPlatformKey } from './platform.ts'

interface StagingChecksums {
  platform: string
  /**
   * 本平台的**按需工具文件**（pandoc / ffmpeg / opencode 那批）。
   *
   * 由落盘那一步按 tools.lock 的 `onDemand` 算出来写在这里，打包侧不用自己维护一份文件名表：
   * 精简版把这些文件排除在安装包外，完整版要求它们在。
   */
  onDemand?: string[]
  files: Record<string, string>
}

interface StageTarget {
  id: string
  findStagedDir(platformKey: string): string
  /** 拷贝到落盘目录时可选重映射文件名 */
  mapFileName?(fileName: string): string
  /**
   * 这个目标要哪些工具；不写 = 全部要。
   *
   * studio 不要 goose（agent 走 opencode；goose 是 client 的 ACP 侧车），
   * 随包只会白白多 256 MB。
   */
  tools?: string[]
}

/** 这个目标要不要这个工具（没声明 tools 就是都要） */
function hasTool(target: StageTarget, toolKey: string): boolean {
  return !target.tools || target.tools.includes(toolKey)
}

/** 回落到 lock 的 release 归档：先按 lock 下载/解压到缓存，再拿出运行时文件 */
async function ensureVendored(tool: (typeof TOOLS)[string], platform: string): Promise<string[]> {
  await tool.ensure(platform)
  return tool.findRuntimeFiles(platform)
}

function writeChecksums(
  dir: string,
  files: Record<string, string>,
  platform: string,
  onDemand: string[] = []
): void {
  const payload: StagingChecksums = { platform, onDemand, files }
  writeFileSync(path.join(dir, CHECKSUMS_FILE), `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
}

function parseStagingChecksums(stagedDir: string): StagingChecksums {
  const filePath = path.join(stagedDir, CHECKSUMS_FILE)
  if (!existsSync(filePath)) {
    throw new Error(`[stage] 缺少 ${filePath}；请先执行 sidecar bootstrap`)
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as StagingChecksums
}

async function stageVendoredTools(
  target: StageTarget,
  platform = findPlatformKey()
): Promise<void> {
  const lock = parseToolsLock()
  const destDir = target.findStagedDir(platform)
  mkdirSync(destDir, { recursive: true })
  const hashes: Record<string, string> = {}
  const onDemand: string[] = []

  for (const tool of Object.values(TOOLS)) {
    if (!hasTool(target, tool.key)) {
      console.log(`[stage:${target.id}] 跳过 ${tool.key}（该目标用不到）`)
      continue
    }
    const pins = findLockPins(lock, tool.key)
    if (!pins || !hasToolPin(pins, platform)) {
      // corex 缺了起不来（引擎）；client 的 goose / pdfium 是 build.rs 直接检的硬依赖
      const required =
        tool.key === 'corex' ||
        (target.id === 'client' && (tool.key === 'goose' || tool.key === 'pdfium'))
      if (required) {
        throw new Error(`[stage] 当前平台无 ${tool.key} 钉死版本: ${platform}（应用=${target.id}）`)
      }
      continue
    }
    // 取包顺序：**在线包优先**（R2，与运行时下载同一份字节，也不依赖连不上的 GitHub），
    // 没有在线包的（corex / goose / 未发布在线包的平台）回落到 lock 的 release 归档。
    const online = findOnlineTool(tool.key, platform)
    const sources = online
      ? await stageOnlineTool(online.key, online.tool, online.package, platform)
      : await ensureVendored(tool, platform)

    for (const src of sources) {
      const rawName = path.basename(src)
      const fileName = target.mapFileName ? target.mapFileName(rawName) : rawName
      const dest = path.join(destDir, fileName)
      cpSync(src, dest)
      hashes[fileName] = hashFile(dest)
      if (isOnDemandPin(pins, platform)) {
        onDemand.push(fileName)
      }
      console.log(`[stage:${target.id}] ${fileName}`)
    }
  }

  writeChecksums(destDir, hashes, platform, onDemand)
  console.log(
    `[stage:${target.id}] 已写入 ${CHECKSUMS_FILE}（${Object.keys(hashes).length} 个文件，` +
      `其中按需 ${onDemand.length} 个）→ ${destDir}`
  )
}

export { hasTool, parseStagingChecksums, stageVendoredTools, writeChecksums }
export type { StageTarget, StagingChecksums }
