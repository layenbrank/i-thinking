import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { COREX_CLI, COREX_DAEMON, VENDOR_DIR } from '../infra/constants.ts'
import { fetchVerified } from '../infra/download.ts'
import { extractArchive, findFileInTree } from '../infra/extract.ts'
import { findToolPin, parseToolsLock } from '../infra/lock.ts'
import { findBinaryName, findPlatformKey } from '../infra/platform.ts'

import type { ToolStrategy } from './types.ts'

function findCorexVendorDir(key = findPlatformKey()): string {
  return path.join(VENDOR_DIR, 'corex', key)
}

function findCorexBinDir(key = findPlatformKey()): string {
  return path.join(findCorexVendorDir(key), 'bin')
}

function findDaemonBinary(key = findPlatformKey()): string {
  return path.join(findCorexBinDir(key), findBinaryName(COREX_DAEMON))
}

function hasCorexVendor(key = findPlatformKey()): boolean {
  return existsSync(findDaemonBinary(key))
}

/**
 * 按 tools.lock 下载 layenbrank/corex release zip 到缓存 corex/<platform>/bin。
 * Layout: corex-daemon(.exe), corex(.exe), optional pdfium.dll / *.so
 */
async function ensureCorexVendor(key = findPlatformKey()): Promise<string> {
  const daemonPath = findDaemonBinary(key)
  if (hasCorexVendor(key)) {
    console.log(`[corex] 缓存命中 ${daemonPath}`)
    return daemonPath
  }

  const lock = parseToolsLock()
  const pin = findToolPin(lock.corex, 'corex', key)
  const vendorDir = findCorexVendorDir(key)
  mkdirSync(vendorDir, { recursive: true })

  const archivePath = path.join(vendorDir, `corex-${pin.version}.zip`)
  const extractDir = path.join(vendorDir, 'extract')

  await fetchVerified(pin.url, archivePath, pin.sha256)

  rmSync(extractDir, { recursive: true, force: true })
  extractArchive(archivePath, extractDir)

  const daemonName = findBinaryName(COREX_DAEMON)
  const cliName = findBinaryName(COREX_CLI)
  const foundDaemon = findFileInTree(extractDir, daemonName)
  if (!foundDaemon) {
    throw new Error(`[corex] 归档内未找到 ${daemonName}`)
  }

  const binDir = findCorexBinDir(key)
  rmSync(binDir, { recursive: true, force: true })
  mkdirSync(binDir, { recursive: true })

  cpSync(foundDaemon, path.join(binDir, daemonName))
  const foundCli = findFileInTree(extractDir, cliName)
  if (foundCli) {
    cpSync(foundCli, path.join(binDir, cliName))
  }

  const daemonSrcDir = path.dirname(foundDaemon)
  for (const entry of readdirSync(daemonSrcDir)) {
    const lower = entry.toLowerCase()
    if (
      lower.endsWith('.dll') ||
      lower.endsWith('.so') ||
      lower.endsWith('.dylib') ||
      lower === 'pdfium.dll'
    ) {
      cpSync(path.join(daemonSrcDir, entry), path.join(binDir, entry))
    }
  }

  if (process.platform !== 'win32') {
    chmodSync(path.join(binDir, daemonName), 0o755)
    if (foundCli) {
      chmodSync(path.join(binDir, cliName), 0o755)
    }
  }

  rmSync(extractDir, { recursive: true, force: true })
  console.log(`[corex] 已落盘 ${pin.version} → ${binDir}`)
  return daemonPath
}

function listCorexRuntimeFiles(key = findPlatformKey()): string[] {
  const binDir = findCorexBinDir(key)
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

const CorexTool: ToolStrategy = {
  id: 'corex',
  async ensure(platformKey) {
    await ensureCorexVendor(platformKey)
  },
  findRuntimeFiles(platformKey) {
    return listCorexRuntimeFiles(platformKey)
  }
}

export {
  CorexTool,
  ensureCorexVendor,
  findCorexBinDir,
  findCorexVendorDir,
  findDaemonBinary,
  hasCorexVendor,
  listCorexRuntimeFiles
}
