import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { FFMPEG_BINARY, VENDOR_DIR } from '../infra/constants.ts'
import { fetchVerified } from '../infra/download.ts'
import { extractArchive, findFileInTree, parseArchiveExt } from '../infra/extract.ts'
import { findToolPin, parseToolsLock } from '../infra/lock.ts'
import { findBinaryName, findPlatformKey } from '../infra/platform.ts'

import type { ToolStrategy } from './types.ts'

function findFfmpegVendorDir(key = findPlatformKey()): string {
  return path.join(VENDOR_DIR, 'ffmpeg', key)
}

function findFfmpegBinDir(key = findPlatformKey()): string {
  return path.join(findFfmpegVendorDir(key), 'bin')
}

function findFfmpegBinary(key = findPlatformKey()): string {
  return path.join(findFfmpegBinDir(key), findBinaryName(FFMPEG_BINARY))
}

function hasFfmpegBinary(key = findPlatformKey()): boolean {
  return existsSync(findFfmpegBinary(key))
}

/**
 * 按 tools.lock 下载 BtbN/FFmpeg-Builds release 到缓存 ffmpeg/<platform>/bin。
 * 落盘 ffmpeg(.exe)；归档内若有 ffprobe/ffplay 一并拷贝。
 */
async function ensureFfmpegVendor(key = findPlatformKey()): Promise<string> {
  const binary = findFfmpegBinary(key)
  if (hasFfmpegBinary(key)) {
    console.log(`[ffmpeg] 缓存命中 ${binary}`)
    return binary
  }

  const lock = parseToolsLock()
  if (!lock.ffmpeg) {
    throw new Error('[ffmpeg] tools.lock 中无钉死版本')
  }
  const pin = findToolPin(lock.ffmpeg, 'ffmpeg', key)
  const vendorDir = findFfmpegVendorDir(key)
  mkdirSync(vendorDir, { recursive: true })

  const ext = parseArchiveExt(pin.url)
  const archivePath = path.join(vendorDir, `ffmpeg-${pin.version}${ext}`)
  const extractDir = path.join(vendorDir, 'extract')

  await fetchVerified(pin.url, archivePath, pin.sha256)

  rmSync(extractDir, { recursive: true, force: true })
  extractArchive(archivePath, extractDir)

  const ffmpegName = findBinaryName(FFMPEG_BINARY)
  const found = findFileInTree(extractDir, ffmpegName)
  if (!found) {
    throw new Error(`[ffmpeg] 归档内未找到 ${ffmpegName}`)
  }

  const binDir = findFfmpegBinDir(key)
  rmSync(binDir, { recursive: true, force: true })
  mkdirSync(binDir, { recursive: true })
  cpSync(found, path.join(binDir, ffmpegName))

  const srcDir = path.dirname(found)
  for (const name of ['ffprobe', 'ffplay']) {
    const fileName = findBinaryName(name)
    const candidate = path.join(srcDir, fileName)
    if (existsSync(candidate)) {
      cpSync(candidate, path.join(binDir, fileName))
    } else {
      const nested = findFileInTree(extractDir, fileName)
      if (nested) {
        cpSync(nested, path.join(binDir, fileName))
      }
    }
  }

  if (process.platform !== 'win32') {
    for (const entry of readdirSync(binDir)) {
      chmodSync(path.join(binDir, entry), 0o755)
    }
  }

  rmSync(extractDir, { recursive: true, force: true })
  console.log(`[ffmpeg] 已落盘 ${pin.version} → ${binDir}`)
  return binary
}

function listFfmpegRuntimeFiles(key = findPlatformKey()): string[] {
  const binDir = findFfmpegBinDir(key)
  if (!existsSync(binDir)) {
    return []
  }
  return readdirSync(binDir)
    .filter(function (name) {
      return !name.startsWith('.')
    })
    .map(function (name) {
      return path.join(binDir, name)
    })
}

const FfmpegTool: ToolStrategy = {
  id: 'ffmpeg',
  async ensure(platformKey) {
    await ensureFfmpegVendor(platformKey)
  },
  findRuntimeFiles(platformKey) {
    return listFfmpegRuntimeFiles(platformKey)
  }
}

export {
  FfmpegTool,
  ensureFfmpegVendor,
  findFfmpegBinary,
  findFfmpegBinDir,
  findFfmpegVendorDir,
  hasFfmpegBinary,
  listFfmpegRuntimeFiles
}
