import { existsSync, mkdirSync, openSync, unlinkSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { COREX_CLI, COREX_DAEMON, COREX_PIPE, PANDOC_BINARY } from './constants'

function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

function findBinaryName(name: string, platform = process.platform): string {
  return platform === 'win32' ? `${name}.exe` : name
}

function isPackagedApp(): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const electron = require('electron') as { app?: { isPackaged?: boolean } }
    return Boolean(electron.app?.isPackaged)
  } catch {
    return false
  }
}

/** Packaged: resources/sidecar；开发: sidecar/staging/<platform> */
function findSidecarRoot(): string {
  if (isPackagedApp()) {
    return path.join(process.resourcesPath, 'sidecar')
  }
  const root = process.env.APP_ROOT ?? process.cwd()
  return path.join(root, 'sidecar', 'staging', findPlatformKey())
}

function findBinaryPath(name: string): string {
  return path.join(findSidecarRoot(), findBinaryName(name))
}

function findDaemonPath(): string {
  return findBinaryPath(COREX_DAEMON)
}

function findCliPath(): string {
  return findBinaryPath(COREX_CLI)
}

function findPandocPath(): string {
  return findBinaryPath(PANDOC_BINARY)
}

function hasBinary(name: string): boolean {
  return existsSync(findBinaryPath(name))
}

/**
 * 对齐 corex `crates/ipc` `data_dir()`：
 * 可写 exe 目录 → OS 项目数据目录 → `.corex`
 */
function findCorexDataDir(): string {
  const exeDir = path.dirname(findDaemonPath())
  if (isWritableDir(exeDir)) {
    return exeDir
  }

  const projectData = findOsCorexDataDir()
  ensureDir(projectData)
  if (isWritableDir(projectData)) {
    return projectData
  }

  const fallback = path.join(process.cwd(), '.corex')
  ensureDir(fallback)
  return fallback
}

/**
 * 对齐 corex `ipc_endpoint(data)`：
 * Windows `\\.\pipe\corex`；Unix `<data_dir>/corex.sock`
 */
function findDefaultIpcEndpoint(): string {
  if (process.platform === 'win32') {
    return COREX_PIPE
  }
  return path.join(findCorexDataDir(), 'corex.sock')
}

function findOsCorexDataDir(): string {
  if (process.platform === 'win32') {
    const base = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    return path.join(base, 'corex')
  }
  if (process.platform === 'darwin') {
    return path.join(os.homedir(), 'Library', 'Application Support', 'corex')
  }
  const xdg = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share')
  return path.join(xdg, 'corex')
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}

function isWritableDir(dir: string): boolean {
  if (!existsSync(dir)) {
    return false
  }
  const probe = path.join(dir, '.corex-write-check')
  try {
    writeFileSync(probe, '')
    unlinkSync(probe)
    return true
  } catch {
    try {
      openSync(dir, 'r')
    } catch {
      // ignore
    }
    return false
  }
}

export {
  findBinaryName,
  findBinaryPath,
  findCliPath,
  findCorexDataDir,
  findDaemonPath,
  findDefaultIpcEndpoint,
  findPandocPath,
  findPlatformKey,
  findSidecarRoot,
  hasBinary
}
