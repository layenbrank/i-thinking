import { app } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { BinExecResult } from '../../../shared/ipc/contracts'
import { isAllowedBinName } from './allowlist'

export class BinService {
  findPath(exeName: string): string {
    if (!isAllowedBinName(exeName)) {
      throw new Error(`bin not allowed: ${exeName}`)
    }
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'bin', exeName)
    }
    return path.join(process.env.APP_ROOT ?? process.cwd(), 'src', 'bin', exeName)
  }

  exec(exeName: string, args?: string[]): Promise<BinExecResult> {
    if (!isAllowedBinName(exeName)) {
      return Promise.resolve({
        code: null,
        signal: null,
        error: `bin not allowed: ${exeName}`
      })
    }
    const safeArgs = (args ?? []).map(function (arg) {
      if (arg.includes('\0')) {
        throw new Error('bin args must not contain null bytes')
      }
      return arg
    })
    const binPath = this.findPath(exeName)
    if (!existsSync(binPath)) {
      return Promise.resolve({
        code: null,
        signal: null,
        error: `bin not found: ${binPath}`
      })
    }
    return new Promise(function (resolve) {
      const proc = spawn(binPath, safeArgs, { stdio: 'pipe', shell: false })
      proc.on('error', function (err) {
        resolve({ code: null, signal: null, error: String(err) })
      })
      proc.on('close', function (code, signal) {
        resolve({ code, signal })
      })
    })
  }
}
