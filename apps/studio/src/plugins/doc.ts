import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { z } from 'zod'

import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'
import { CHANNELS } from './channels'
import { findPandocPath, hasBinary, PANDOC_BINARY } from './sidecar'

/** Pandoc convert process timeout (main-only). */
const CONVERT_TIMEOUT_MS = 120_000

/** Allowed pandoc output formats for convert IPC. */
const OUTPUT_FORMATS = ['markdown', 'html', 'docx', 'pdf', 'plain'] as const

type OutputFormat = (typeof OUTPUT_FORMATS)[number]

interface ConvertP {
  inputPath: string
  outputPath: string
  format: OutputFormat
}

interface ConvertR {
  outputPath: string
  format: OutputFormat
}

const ConvertSchema = z.object({
  inputPath: z.string().min(1).max(4096),
  outputPath: z.string().min(1).max(4096),
  format: z.enum(OUTPUT_FORMATS)
})

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

function buildPlugin(): Plugin {
  return {
    name: 'doc',
    register(ctx: Context) {
      const service = new Service()
      registerHandler(ctx, CHANNELS.DOC.CONVERT, ConvertSchema, function (input) {
        return service.convert(input)
      })
      ctx.logger.child('doc').info('registered')
    }
  }
}

export type { ConvertP, ConvertR, OutputFormat }
export { ConvertSchema, OUTPUT_FORMATS, Service, buildPlugin }
