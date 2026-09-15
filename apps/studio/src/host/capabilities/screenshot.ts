import { app } from 'electron'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type Out } from '../../shared/ipc/specs'
import type { CorexHost } from './sidecar'

type CaptureR = Out<typeof CHANNELS.SCREENSHOT.CAPTURE>

class Service {
  private readonly corex: CorexHost

  constructor(corex: CorexHost) {
    this.corex = corex
  }

  async capture(): Promise<CaptureR> {
    if (!this.corex.hasAction('capture.screenshot')) {
      throw new IpcError('SCREENSHOT_ACTION_UNAVAILABLE', 'corex action capture.screenshot unavailable')
    }

    const output = await this.buildOutputPath()
    const data = await this.corex.invokeAction('capture.screenshot', { to: output })
    const resultPath = parseCapturePath(data)

    if (!resultPath || !existsSync(resultPath)) {
      throw new IpcError('SCREENSHOT_NO_FILE', 'screenshot capture did not produce a file')
    }
    return {
      path: resultPath,
      width: 0,
      height: 0
    }
  }

  private async buildOutputPath(): Promise<string> {
    const dir = path.join(app.getPath('userData'), 'screenshots')
    await mkdir(dir, {
      recursive: true
    })
    return path.join(dir, `screenshot-${Date.now()}.png`)
  }
}

/**
 * Corex capture.screenshot returns the written path as a string,
 * or an object with `path`.
 */
function parseCapturePath(data: unknown): string {
  if (typeof data === 'string' && data.length > 0) {
    return data
  }
  if (data && typeof data === 'object') {
    const pathValue = (data as { path?: unknown }).path
    if (typeof pathValue === 'string' && pathValue.length > 0) {
      return pathValue
    }
  }
  throw new IpcError('SCREENSHOT_BAD_PAYLOAD', 'screenshot capture returned unexpected payload')
}

export type { CaptureR }
export { Service }
// 临时 re-export：specs 批次收尾时移除
export { CaptureSchema } from '../../shared/ipc/specs/screenshot'
