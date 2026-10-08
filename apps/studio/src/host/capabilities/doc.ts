import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { CHANNELS } from '@/shared/ipc/channels'
import { IpcError } from '@/shared/ipc/error'
import { type In, type Out } from '@/shared/ipc/specs'
import { findToolBinary } from '@/host/capabilities/tools/install'

/** Pandoc convert process timeout (main-only). */
const CONVERT_TIMEOUT_MS = 120_000

type ConvertP = In<typeof CHANNELS.DOC.CONVERT>
type ConvertR = Out<typeof CHANNELS.DOC.CONVERT>

class Service {
  convert(input: ConvertP): Promise<ConvertR> {
    // pandoc 属在线工具：运行时下载的那份优先，完整版内置的那份兜底（见 capabilities/tools）
    const pandocPath = findToolBinary('pandoc')
    if (!pandocPath) {
      return Promise.reject(
        new IpcError('DOC_PANDOC_MISSING', '未安装 pandoc，请在「设置 → 工具」里下载')
      )
    }

    const inputPath = path.resolve(input.inputPath)
    const outputPath = path.resolve(input.outputPath)
    if (!existsSync(inputPath)) {
      return Promise.reject(new IpcError('DOC_INPUT_NOT_FOUND', `input not found: ${inputPath}`))
    }
    if (inputPath.includes('\0') || outputPath.includes('\0')) {
      return Promise.reject(new IpcError('DOC_CONVERT_FAILED', 'paths must not contain null bytes'))
    }

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
export { ConvertSchema, OUTPUT_FORMATS } from '@/shared/ipc/specs/doc'
export type { OutputFormat } from '@/shared/ipc/specs/doc'
