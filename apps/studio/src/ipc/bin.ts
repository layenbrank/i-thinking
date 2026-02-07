import { type IpcMain } from 'electron'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { getBinPath } from '../lib.js'

export function registerBinIpc(ipcMain: IpcMain): void {
  ipcMain.handle('bin:getPath', function (_event, exeName: string): string {
    return getBinPath(exeName)
  })

  ipcMain.handle(
    'bin:exec',
    function (
      _event,
      exeName: string,
      args?: string[]
    ): Promise<{
      code: number | null
      signal: NodeJS.Signals | null
      error?: string
    }> {
      const binPath = getBinPath(exeName)
      if (!existsSync(binPath)) {
        return Promise.resolve({
          code: null,
          signal: null,
          error: `bin not found: ${binPath}`
        })
      }
      return new Promise(function (resolve) {
        const proc = spawn(binPath, args ?? [], {
          stdio: 'pipe'
        })
        proc.on('error', function (err) {
          resolve({
            code: null,
            signal: null,
            error: String(err)
          })
        })
        proc.on('close', function (code, signal) {
          resolve({ code, signal })
        })
      })
    }
  )
}
