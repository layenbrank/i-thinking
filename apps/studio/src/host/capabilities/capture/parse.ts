import { existsSync, readFileSync } from 'node:fs'

/**
 * 从 run_directive 返回值取出 `save_to: screenshot` 路径。
 * 形状可能是 `{ variables: { screenshot } }`、顶层字段或纯字符串。
 */
function parseShotPath(data: unknown): string | null {
  if (typeof data === 'string' && data.length > 0) return data
  if (!data || typeof data !== 'object') return null
  const doc = data as Record<string, unknown>

  const direct = findShotField(doc.screenshot)
  if (direct) return direct

  if (doc.variables && typeof doc.variables === 'object') {
    const nested = findShotField((doc.variables as Record<string, unknown>).screenshot)
    if (nested) return nested
  }

  if (doc.outputs && typeof doc.outputs === 'object') {
    const nested = findShotField((doc.outputs as Record<string, unknown>).screenshot)
    if (nested) return nested
  }

  return null
}

function findShotField(raw: unknown): string | null {
  if (typeof raw === 'string' && raw) return raw
  if (raw && typeof raw === 'object') {
    const path = (raw as { path?: unknown }).path
    if (typeof path === 'string' && path) return path
  }
  return null
}

/** 一次读盘：PNG 字节 + IHDR 宽高 */
function readPng(filePath: string): { bytes: Uint8Array; width: number; height: number } {
  if (!existsSync(filePath)) {
    return { bytes: new Uint8Array(), width: 0, height: 0 }
  }
  const buffer = readFileSync(filePath)
  const bytes = new Uint8Array(buffer)
  if (buffer.length < 24 || buffer.toString('ascii', 1, 4) !== 'PNG') {
    return { bytes, width: 0, height: 0 }
  }
  return {
    bytes,
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

/** @deprecated 用 readPng；保留给只关心尺寸的调用方 */
function readPngSize(filePath: string): { width: number; height: number } {
  const { width, height } = readPng(filePath)
  return { width, height }
}

export { parseShotPath, readPng, readPngSize }
