import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { findPandocPath, hasBinary } from '@main/modules/sidecar/paths'
import { PANDOC_BINARY } from '@main/modules/sidecar/constants'
import { CONVERT_TIMEOUT_MS } from './constants'
import type { ConvertP, ConvertR } from '@shared/ipc/doc'

class Service {
  convert(input: ConvertP): Promise<ConvertR> {
    if (!hasBinary(PANDOC_BINARY)) {
      return Promise.reject(new Error(`pandoc not found at ${findPandocPath()}`))
    }

    const inputPath = path.resolve(input.inputPath)
    const outputPath = path.resolve(input.outputPath)
    if (!existsSync(inputPath)) {
      return Promise.reject(new Error(`input not found: ${inputPath}`))
    }
    if (inputPath.includes('\0') || outputPath.includes('\0')) {
      return Promise.reject(new Error('paths must not contain null bytes'))
    }

    const pandocPath = findPandocPath()
    const args = [inputPath, '-o', outputPath, '-t', input.format]

    return new Promise(function (resolve, reject) {
      const child = spawn(pandocPath, args, {
        stdio: 'pipe',
        shell: false,
        windowsHide: true
      })

      let stderr = ''
      const timer = setTimeout(function () {
        child.kill()
        reject(new Error('pandoc convert timeout'))
      }, CONVERT_TIMEOUT_MS)

      child.stderr.on('data', function (chunk: Buffer) {
        stderr += chunk.toString('utf8')
      })

      child.on('error', function (err) {
        clearTimeout(timer)
        reject(err)
      })

      child.on('close', function (code) {
        clearTimeout(timer)
        if (code !== 0) {
          reject(new Error(stderr.trim() || `pandoc exited with code ${code}`))
          return
        }
        resolve({ outputPath, format: input.format })
      })
    })
  }
}

export { Service }
