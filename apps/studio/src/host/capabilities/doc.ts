import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type In, type Out } from '../../shared/ipc/specs'
import { findPandocPath, hasBinary, PANDOC_BINARY } from './sidecar'

/** Pandoc convert process timeout (main-only). */
const CONVERT_TIMEOUT_MS = 120_000

type ConvertP = In<typeof CHANNELS.DOC.CONVERT>
type ConvertR = Out<typeof CHANNELS.DOC.CONVERT>

class Service {
  convert(input: ConvertP): Promise<ConvertR> {
    if (!hasBinary(PANDOC_BINARY)) {
      return Promise.reject(new IpcError('DOC_PANDOC_MISSING', `pandoc not found at ${findPandocPath()}`))
    }

    const inputPath = path.resolve(input.inputPath)
    const outputPath = path.resolve(input.outputPath)
    if (!existsSync(inputPath)) {
      return Promise.reject(new IpcError('DOC_INPUT_NOT_FOUND', `input not found: ${inputPath}`))
    }
    if (inputPath.includes('\0') || outputPath.includes('\0')) {
      return Promise.reject(new IpcError('DOC_CONVERT_FAILED', 'paths must not contain null bytes'))
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
        reject(new IpcError('DOC_TIMEOUT', 'pandoc convert timeout'))
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
          reject(new IpcError('DOC_CONVERT_FAILED', stderr.trim() || `pandoc exited with code ${code}`))
          return
        }
        resolve({ outputPath, format: input.format })
      })
    })
  }
}

export type { ConvertP, ConvertR }
export { Service }
// 临时 re-export：让既有测试与消费方不动，specs 批次收尾时移除
export { ConvertSchema, OUTPUT_FORMATS } from '../../shared/ipc/specs/doc'
export type { OutputFormat } from '../../shared/ipc/specs/doc'
