import { existsSync } from 'node:fs'
import path from 'node:path'

import { COREX_CLI, COREX_DAEMON, PANDOC_BINARY } from './constants'

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

export {
  findBinaryName,
  findBinaryPath,
  findCliPath,
  findDaemonPath,
  findPandocPath,
  findPlatformKey,
  findSidecarRoot,
  hasBinary
}
