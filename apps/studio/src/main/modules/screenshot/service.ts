import { app } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { CorexHost } from '@main/modules/sidecar/corex-host'

type ScreenshotCaptureResult = {
  path: string
  width: number
  height: number
}

type ScreenshotRecordStopResult = {
  path: string
  frameCount: number
  durationMs: number
}

class ScreenshotService {
  private readonly corex: CorexHost

  constructor(corex: CorexHost) {
    this.corex = corex
  }

  async capture(): Promise<ScreenshotCaptureResult> {
    if (!this.corex.hasModule('screenshot')) {
      throw new Error('corex screenshot module unavailable')
    }

    const output = await this.buildOutputPath('screenshot', 'png')
    const data = (await this.corex.invoke('screenshot.capture', {
      output
    })) as ScreenshotCaptureResult

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
    await this.corex.invoke('screenshot.recordStart')
  }

  async recordStop(): Promise<ScreenshotRecordStopResult> {
    if (!this.corex.hasModule('screenshot')) {
      throw new Error('corex screenshot module unavailable')
    }

    const output = await this.buildOutputPath('recording', 'gif')
    const data = (await this.corex.invoke('screenshot.recordStop', {
      output
    })) as ScreenshotRecordStopResult

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
    await mkdir(dir, { recursive: true })
    return path.join(dir, `${kind}-${Date.now()}.${ext}`)
  }
}

export type { ScreenshotCaptureResult, ScreenshotRecordStopResult }
export { ScreenshotService }
