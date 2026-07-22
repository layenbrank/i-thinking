import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { SidecarExecResult } from '@shared/ipc/contracts'
import { findPlatformSidecars, isAllowedSidecarName } from './allowlist'

function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

class SidecarService {
  findPath(name: string): string {
    if (!isAllowedSidecarName(name)) {
      throw new Error(`sidecar not allowed: ${name}`)
    }
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'sidecar', name)
    }
    const root = process.env.APP_ROOT ?? process.cwd()
    return path.join(root, 'sidecar', 'staging', findPlatformKey(), name)
  }

  exec(name: string, args?: string[]): Promise<SidecarExecResult> {
    if (!isAllowedSidecarName(name)) {
      return Promise.resolve({
        code: null,
        signal: null,
        error: `sidecar not allowed: ${name}`
      })
    }
    const allowedOnPlatform = findPlatformSidecars() as readonly string[]
    if (!allowedOnPlatform.includes(name)) {
      return Promise.resolve({
        code: null,
        signal: null,
        error: `sidecar not available on ${process.platform}: ${name}`
      })
    }
    const safeArgs = (args ?? []).map(function (arg) {
      if (arg.includes('\0')) {
        throw new Error('sidecar args must not contain null bytes')
      }
      return arg
    })
    const sidecarPath = this.findPath(name)
    if (!existsSync(sidecarPath)) {
      return Promise.resolve({
        code: null,
        signal: null,
        error: `sidecar not found: ${sidecarPath}`
      })
    }
    return new Promise(function (resolve) {
      const proc = spawn(sidecarPath, safeArgs, { stdio: 'pipe', shell: false })
      proc.on('error', function (err) {
        resolve({ code: null, signal: null, error: String(err) })
      })
      proc.on('close', function (code, signal) {
        resolve({ code, signal })
      })
    })
  }
}

export { SidecarService }
