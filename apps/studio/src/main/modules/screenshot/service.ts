import { app } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { CorexHost } from '@main/modules/sidecar/corex-host'
import type { CaptureResult, RecordStopResult } from './schemas'

class Service {
  private readonly corex: CorexHost

  constructor(corex: CorexHost) {
    this.corex = corex
  }

  async capture(): Promise<CaptureResult> {
    if (!this.corex.hasModule('screenshot')) {
      throw new Error('corex screenshot module unavailable')
    }

    const output = await this.buildOutputPath('screenshot', 'png')
    const data = (await this.corex.invoke('screenshot.capture', {
      output
    })) as CaptureResult

    if (!data?.path || !existsSync(data.path)) {
      throw new Error('screenshot capture did not produce a file')
    }
    return {
      path: data.path,
      width: Number(data.width) || 0,
      height: Number(data.height) || 0
    }
  }

  async recordStart(): Promise<void> {
    if (!this.corex.hasModule('screenshot')) {
      throw new Error('corex screenshot module unavailable')
    }

    const output = await this.buildOutputPath('recording', 'mkv')
    await this.corex.invoke('screenshot.recordStart', {
      output
    })
  }

  async recordStop(): Promise<RecordStopResult> {
    if (!this.corex.hasModule('screenshot')) {
      throw new Error('corex screenshot module unavailable')
    }

    const data = (await this.corex.invoke('screenshot.recordStop', {})) as RecordStopResult

    if (!data?.path || !existsSync(data.path)) {
      throw new Error('screenshot recordStop did not produce a file')
    }
    return {
      path: data.path,
      frameCount: Number(data.frameCount) || 0,
      durationMs: Number(data.durationMs) || 0
    }
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

export type { CaptureResult, RecordStopResult } from './schemas'
export { Service }
