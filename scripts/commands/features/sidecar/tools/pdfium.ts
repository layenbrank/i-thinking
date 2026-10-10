import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { VENDOR_DIR } from '../infra/constants.ts'
import { fetchVerified } from '../infra/download.ts'
import { extractArchive, findFileInTree, parseArchiveExt } from '../infra/extract.ts'
import { findToolPin, parseToolsLock } from '../infra/lock.ts'
import { findPlatformKey } from '../infra/platform.ts'
import { isVendorReady, writeVendorVersion } from '../infra/vendor.ts'

import type { ToolStrategy } from './types.ts'

function findPdfiumVendorDir(key = findPlatformKey()): string {
  return path.join(VENDOR_DIR, 'pdfium', key)
}

function findPdfiumBinDir(key = findPlatformKey()): string {
  return path.join(findPdfiumVendorDir(key), 'bin')
}

/** bblanchon/pdfium-binaries 归档里那个库的文件名（按平台换名） */
function findPdfiumLibraryName(key = findPlatformKey()): string {
  const platform = key.split('-')[0]
  if (platform === 'win32') {
    return 'pdfium.dll'
  }
  return platform === 'darwin' ? 'libpdfium.dylib' : 'libpdfium.so'
}

function findPdfiumLibrary(key = findPlatformKey()): string {
  return path.join(findPdfiumBinDir(key), findPdfiumLibraryName(key))
}

/**
 * 按 tools.lock 的 `pdfium` pin 下载 bblanchon/pdfium-binaries 归档到缓存 pdfium/<platform>/bin，
 * 只留运行时库那一个文件（corex 的 PDF 动作、以及 client 的 tauri resources 都要它）。
 *
 * 版本要与 corex 的 `assets/pdfium/VERSION` 对齐：corex 用起 pdfium-render 时是按
 * chromium/XXXX 编译进来的，两边错开会在加载时报符号对不上。
 * 缓存命中不是「有文件就算」，而是「有 lock 里那个版本」：见 infra/vendor.ts
 */
async function ensurePdfiumVendor(key = findPlatformKey()): Promise<string> {
  const lock = parseToolsLock()
  if (!lock.pdfium) {
    throw new Error('[pdfium] tools.lock 中无钉死版本')
  }
  const pin = findToolPin(lock.pdfium, 'pdfium', key)
  const vendorDir = findPdfiumVendorDir(key)
  const library = findPdfiumLibrary(key)
  if (isVendorReady(vendorDir, pin.version, library)) {
    console.log(`[pdfium] 缓存命中 ${pin.version} → ${library}`)
    return library
  }

  mkdirSync(vendorDir, { recursive: true })

  const archivePath = path.join(vendorDir, `pdfium-${pin.version}${parseArchiveExt(pin.url)}`)
  const extractDir = path.join(vendorDir, 'extract')

  await fetchVerified(pin.url, archivePath, pin.sha256)

  rmSync(extractDir, { recursive: true, force: true })
  extractArchive(archivePath, extractDir)

  const libraryName = findPdfiumLibraryName(key)
  const found = findFileInTree(extractDir, libraryName)
  if (!found) {
    throw new Error(`[pdfium] 归档内未找到 ${libraryName}`)
  }

  const binDir = findPdfiumBinDir(key)
  rmSync(binDir, { recursive: true, force: true })
  mkdirSync(binDir, { recursive: true })
  const dest = path.join(binDir, libraryName)
  cpSync(found, dest)
  if (process.platform !== 'win32') {
    chmodSync(dest, 0o755)
  }

  rmSync(extractDir, { recursive: true, force: true })
  writeVendorVersion(vendorDir, pin.version)
  console.log(`[pdfium] 已落盘 ${pin.version} → ${binDir}`)
  return library
}

function listPdfiumRuntimeFiles(key = findPlatformKey()): string[] {
  const binDir = findPdfiumBinDir(key)
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

const PdfiumTool: ToolStrategy = {
  key: 'pdfium',
  async ensure(platformKey) {
    await ensurePdfiumVendor(platformKey)
  },
  findRuntimeFiles(platformKey) {
    return listPdfiumRuntimeFiles(platformKey)
  }
}

export {
  ensurePdfiumVendor,
  findPdfiumBinDir,
  findPdfiumLibrary,
  findPdfiumVendorDir,
  listPdfiumRuntimeFiles,
  PdfiumTool
}
