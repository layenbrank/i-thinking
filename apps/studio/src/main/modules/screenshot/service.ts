import { app } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { CorexHost } from '@main/modules/sidecar/host'
import type { CaptureResult, RecordStopResult } from './schemas'

class Service {
  private readonly corex: CorexHost

  constructor(corex: CorexHost) {
    this.corex = corex
  }

  async capture(): Promise<CaptureResult> {
    if (!this.corex.hasAction('capture.screenshot')) {
      throw new Error('corex action capture.screenshot unavailable')
    }

    const output = await this.buildOutputPath('screenshot', 'png')
    const data = await this.corex.invokeAction('capture.screenshot', { to: output })
    const resultPath = parseCapturePath(data, output)

    if (!resultPath || !existsSync(resultPath)) {
      throw new Error('screenshot capture did not produce a file')
    }
    return {
      path: resultPath,
      width: 0,
      height: 0
    }
  }

  async recordStart(): Promise<void> {
    throw new Error('screen recording is not provided by corex; use capture.screenshot')
  }

  async recordStop(): Promise<RecordStopResult> {
    throw new Error('screen recording is not provided by corex; use capture.screenshot')
  }

  private async buildOutputPath(kind: 'screenshot' | 'recording', ext: string): Promise<string> {
    const dirName = kind === 'screenshot' ? 'screenshots' : 'recordings'
    const dir = path.join(app.getPath('userData'), dirName)
    await mkdir(dir, {
      recursive: true
    })
    return path.join(dir, `${kind}-${Date.now()}.${ext}`)
  }
}

function parseCapturePath(data: unknown, fallback: string): string {
  if (typeof data === 'string' && data.length > 0) {
    return data
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    if (typeof record.path === 'string') {
      return record.path
    }
    if (typeof record.File === 'string') {
      return record.File
    }
    if (typeof record.to === 'string') {
      return record.to
    }
  }
  return fallback
}

export type { CaptureResult, RecordStopResult } from './schemas'
export { Service }
