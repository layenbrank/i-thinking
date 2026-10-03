import { globalShortcut } from 'electron'
import { existsSync } from 'node:fs'

import type { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import type { Out } from '../../shared/ipc/specs'
import type { Context } from '../framework/context'
import type { Plugin } from '../framework/module'
import { parseShotPath, readPng } from './capture-parse'
import { CAPTURE_DIRECTIVE, buildPath, isAllowedPath } from './capture-path'
import type { OverlayWindowPort } from './overlay-window'
import type { CorexHost } from './sidecar'
import type { ThroughHost } from './through'

type Shot = Out<typeof CHANNELS.CAPTURE.SCREENSHOT>

interface CaptureSession {
  path: string
  width: number
  height: number
}

class Service {
  private readonly corex: CorexHost
  private readonly overlay: OverlayWindowPort
  private readonly through: ThroughHost
  private session: CaptureSession | null = null

  constructor(corex: CorexHost, overlay: OverlayWindowPort, through: ThroughHost) {
    this.corex = corex
    this.overlay = overlay
    this.through = through
  }

  async screenshot(): Promise<Shot> {
    if (!this.corex.isRunning()) {
      throw new IpcError('CAPTURE_NOT_READY', 'corex sidecar is not ready')
    }

    const output = await buildPath()
    this.overlay.toConceal()
    await sleep(60)

    let data: unknown
    try {
      data = await this.corex.runDirective(CAPTURE_DIRECTIVE, { out: output })
    } catch (error) {
      this.overlay.toReveal()
      throw new IpcError(
        'CAPTURE_DIRECTIVE_UNAVAILABLE',
        error instanceof Error ? error.message : String(error)
      )
    }

    this.overlay.toReveal()

    const resultPath = parseShotPath(data) ?? output
    if (!existsSync(resultPath)) {
      throw new IpcError('CAPTURE_NO_FILE', 'capture-screenshot did not produce a file')
    }
    if (!isAllowedPath(resultPath)) {
      throw new IpcError('CAPTURE_BAD_PATH', 'capture path escapes shared media dirs')
    }

    const { bytes, width, height } = readPng(resultPath)
    if (bytes.byteLength === 0) {
      throw new IpcError('CAPTURE_EMPTY', 'capture file is empty')
    }

    return { path: resultPath, width, height, bytes }
  }

  async open(): Promise<Shot> {
    const shot = await this.screenshot()
    this.session = { path: shot.path, width: shot.width, height: shot.height }
    this.through.updateCaptureMode(true)
    this.overlay.toUpdate({ visible: true, mode: 'capture' })
    this.overlay.toPushEvent({
      type: 'session',
      path: shot.path,
      width: shot.width,
      height: shot.height,
      bytes: shot.bytes
    })
    return shot
  }

  close(): void {
    this.session = null
    this.through.updateCaptureMode(false)
    this.overlay.toUpdate({ mode: 'idle' })
  }

  recorder(): never {
    throw new IpcError('CAPTURE_RECORDER_UNAVAILABLE', 'capture recorder is not available yet')
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms)
  })
}

const SHORTCUT = 'Alt+Q'

interface CapturePlugin extends Plugin {
  service: Service | null
}

function buildPlugin(overlay: OverlayWindowPort, through: ThroughHost): CapturePlugin {
  const plugin: CapturePlugin = {
    name: 'capture',
    service: null,
    register(ctx: Context) {
      const service = new Service(ctx.corex, overlay, through)
      plugin.service = service

      try {
        globalShortcut.register(SHORTCUT, function () {
          void service.open().catch(function (error) {
            ctx.logger.child('capture').warn('shortcut capture failed', error)
          })
        })
      } catch (error) {
        ctx.logger.child('capture').warn('globalShortcut register failed', error)
      }
    },
    dispose() {
      globalShortcut.unregister(SHORTCUT)
      plugin.service = null
    }
  }
  return plugin
}

export { SHORTCUT, Service, buildPlugin }
export type { CaptureSession }