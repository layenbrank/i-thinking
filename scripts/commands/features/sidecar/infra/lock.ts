import { existsSync, readFileSync } from 'node:fs'

import { TOOLS_LOCK_PATH } from './constants.ts'
import { findPlatformKey } from './platform.ts'

interface ToolPin {
  version: string
  url: string
  sha256: string
  /**
   * true = **按需工具**：这份 pin 是「完整版内置」那条路的归档（GitHub release）。
   *
   * 落盘一律落（`stage` 不看档位）；精简版打包时由 forge 按 staging 的 `checksums.json.onDemand`
   * 排除它们，改由 Studio 运行时从在线源下载（见 `apps/studio/sidecar/manifest.json`）。
   */
  onDemand?: boolean
}

interface ToolsLock {
  schemaVersion: number
  corex: Record<string, ToolPin>
  ffmpeg?: Record<string, ToolPin>
  goose?: Record<string, ToolPin>
  opencode?: Record<string, ToolPin>
  pandoc: Record<string, ToolPin>
  /** corex 的 PDF 运行时库（client 的构建期硬依赖，随安装包发出） */
  pdfium?: Record<string, ToolPin>
}

function parseToolsLock(filePath = TOOLS_LOCK_PATH): ToolsLock {
  if (!existsSync(filePath)) {
    throw new Error(`[tools-lock] 缺少文件 ${filePath}`)
  }
  const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as ToolsLock
  if (parsed.schemaVersion !== 1) {
    throw new Error(`[tools-lock] 不支持的 schemaVersion: ${parsed.schemaVersion}`)
  }
  parsed.ffmpeg = parsed.ffmpeg ?? {}
  parsed.goose = parsed.goose ?? {}
  parsed.opencode = parsed.opencode ?? {}
  parsed.pdfium = parsed.pdfium ?? {}
  return parsed
}

function findLockPins(lock: ToolsLock, toolKey: string): Record<string, ToolPin> | undefined {
  const pinsByTool: Record<string, Record<string, ToolPin> | undefined> = {
    corex: lock.corex,
    ffmpeg: lock.ffmpeg,
    goose: lock.goose,
    opencode: lock.opencode,
    pandoc: lock.pandoc,
    pdfium: lock.pdfium
  }
  return pinsByTool[toolKey]
}

function findToolPin(
  pins: Record<string, ToolPin>,
  toolKey: string,
  key = findPlatformKey()
): ToolPin {
  const pin = pins[key]
  if (!pin) {
    throw new Error(`[tools-lock] 无 ${toolKey} 钉死版本: ${key}`)
  }
  return pin
}

function hasToolPin(pins: Record<string, ToolPin>, key = findPlatformKey()): boolean {
  return Boolean(pins[key])
}

/** 这个工具在当前平台是否「按需」（不进安装包，运行时在线下载） */
function isOnDemandPin(pins: Record<string, ToolPin>, key = findPlatformKey()): boolean {
  return Boolean(pins[key]?.onDemand)
}

export { findLockPins, findToolPin, hasToolPin, isOnDemandPin, parseToolsLock }
export type { ToolPin, ToolsLock }
