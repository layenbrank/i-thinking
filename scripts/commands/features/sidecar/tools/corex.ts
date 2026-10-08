import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import path from 'node:path'

import { COREX_CLI, COREX_DAEMON, COREX_MCP, VENDOR_DIR } from '../infra/constants.ts'
import { fetchVerified } from '../infra/download.ts'
import { extractArchive, findFileInTree } from '../infra/extract.ts'
import { findToolPin, parseToolsLock } from '../infra/lock.ts'
import { findBinaryName, findPlatformKey } from '../infra/platform.ts'
import { isVendorReady, writeVendorVersion } from '../infra/vendor.ts'

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

/** MCP 侧车：opencode 等按名字拉起它，所以得跟着 corex 一起随包 */
function findMcpBinary(key = findPlatformKey()): string {
  return path.join(findCorexBinDir(key), findBinaryName(COREX_MCP))
}

/**
 * 按 tools.lock 把 corex zip 下到缓存 corex/<platform>/bin —— 直链是自建 R2 镜像
 * （corex 是自研 sidecar，不依赖 GitHub releases）。
 * Layout: corex-daemon(.exe), corex(.exe), corex-mcp(.exe), optional pdfium.dll / *.so
 *
 * 缓存命中不是「有文件就算」，而是「有 lock 里那个版本且该有的文件都在」：见 infra/vendor.ts
 */
async function ensureCorexVendor(key = findPlatformKey()): Promise<string> {
  const lock = parseToolsLock()
  const pin = findToolPin(lock.corex, 'corex', key)
  const vendorDir = findCorexVendorDir(key)
  const daemonPath = findDaemonBinary(key)
  if (isVendorReady(vendorDir, pin.version, [daemonPath, findMcpBinary(key)])) {
    console.log(`[corex] 缓存命中 ${pin.version} → ${daemonPath}`)
    return daemonPath
  }

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

  const mcpName = findBinaryName(COREX_MCP)
  const foundMcp = findFileInTree(extractDir, mcpName)
  if (foundMcp) {
    cpSync(foundMcp, path.join(binDir, mcpName))
  } else {
    // 不报错也不静默：归档少它时，判定为「这份缓存没准备好」，下次会重新解压并再提醒一次
    console.warn(`[corex] 归档里没有 ${mcpName}：opencode 侧要用它时会找不到`)
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
    for (const name of [cliName, mcpName]) {
      const filePath = path.join(binDir, name)
      if (existsSync(filePath)) {
        chmodSync(filePath, 0o755)
      }
    }
  }

  rmSync(extractDir, { recursive: true, force: true })
  writeVendorVersion(vendorDir, pin.version)
  console.log(`[corex] 已落盘 ${pin.version} → ${binDir}`)
  return daemonPath
}

function findCorexRuntimeFiles(key = findPlatformKey()): string[] {
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
  key: 'corex',
  async ensure(platformKey) {
    await ensureCorexVendor(platformKey)
  },
  findRuntimeFiles(platformKey) {
    return findCorexRuntimeFiles(platformKey)
  }
}

export {
  CorexTool,
  ensureCorexVendor,
  findCorexBinDir,
  findCorexVendorDir,
  findDaemonBinary,
  findMcpBinary,
  findCorexRuntimeFiles
}
