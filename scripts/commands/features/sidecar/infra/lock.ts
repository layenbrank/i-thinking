import { existsSync, readFileSync } from 'node:fs'

import { TOOLS_LOCK_PATH } from './constants.ts'
import { findPlatformKey } from './platform.ts'

interface ToolPin {
  version: string
  url: string
  sha256: string
}

interface ToolsLock {
  schemaVersion: number
  corex: Record<string, ToolPin>
  ffmpeg?: Record<string, ToolPin>
  pandoc: Record<string, ToolPin>
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
  return parsed
}

function findLockPins(lock: ToolsLock, toolId: string): Record<string, ToolPin> | undefined {
  const pinsById: Record<string, Record<string, ToolPin> | undefined> = {
    corex: lock.corex,
    ffmpeg: lock.ffmpeg,
    pandoc: lock.pandoc
  }
  return pinsById[toolId]
}

function findToolPin(pins: Record<string, ToolPin>, tool: string, key = findPlatformKey()): ToolPin {
  const pin = pins[key]
  if (!pin) {
    throw new Error(`[tools-lock] 无 ${tool} 钉死版本: ${key}`)
  }
  return pin
}

function hasToolPin(pins: Record<string, ToolPin>, key = findPlatformKey()): boolean {
  return Boolean(pins[key])
}

export type { ToolPin, ToolsLock }
export { findLockPins, findToolPin, hasToolPin, parseToolsLock }
