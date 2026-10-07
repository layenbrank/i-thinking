import { type BrowserWindow, autoUpdater } from 'electron'

import { CHANNELS } from '../../shared/ipc/channels'
import { IpcError } from '../../shared/ipc/error'
import { type Out, type PushOut } from '../../shared/ipc/specs'
import { type Context } from '../framework/context'

type FindStatusR = Out<typeof CHANNELS.UPDATER.READ>
type CheckR = Out<typeof CHANNELS.UPDATER.CHECK>
type UpdaterEvent = PushOut<typeof CHANNELS.UPDATER.EVENT>

import { findFeedUrl, hasSquirrelFirstRun } from './updater-feed'

function waitForCheck(): Promise<CheckR> {
  return new Promise(function (resolve, reject) {
    function finish(next: () => void) {
      autoUpdater.removeListener('update-available', onAvailable)
      autoUpdater.removeListener('update-not-available', onNotAvailable)
      autoUpdater.removeListener('error', onError)
      next()
    }

    function onAvailable() {
      finish(function () {
        resolve({
          available: true,
          version: null,
          releaseNotes: null
        })
      })
    }

    function onNotAvailable() {
      finish(function () {
        resolve({
          available: false,
          version: null,
          releaseNotes: null,
          reason: 'latest'
        })
      })
    }

    function onError(error: Error) {
      finish(function () {
        reject(error)
      })
    }

    autoUpdater.once('update-available', onAvailable)
    autoUpdater.once('update-not-available', onNotAvailable)
    autoUpdater.once('error', onError)
    autoUpdater.checkForUpdates()
  })
}

class Service {
  private readonly ctx: Context
  private readonly findWindow: () => BrowserWindow | null
  private checking = false
  private downloading = false
  private downloaded = false
  private version: string | null = null
  private error: string | null = null
  private enabled = false
  private wired = false

  constructor(ctx: Context, findWindow: () => BrowserWindow | null) {
    this.ctx = ctx
    this.findWindow = findWindow
  }

  configure(): void {
    if (this.ctx.isDev || !this.ctx.app.isPackaged) {
      this.enabled = false
      return
    }

    const feedUrl = findFeedUrl()
    if (!feedUrl) {
      this.enabled = false
      this.ctx.logger
        .child('updater')
        .info('disabled: set STUDIO_UPDATE_URL or STUDIO_S3_UPDATE_BASE')
      return
    }

    autoUpdater.setFeedURL({ url: feedUrl })
    this.enabled = true
    this.wireEvents()
  }

  toRead(): FindStatusR {
    return {
      enabled: this.enabled,
      checking: this.checking,
      downloading: this.downloading,
      downloaded: this.downloaded,
      progress: null,
      version: this.version,
      error: this.error
    }
  }

  async check(): Promise<CheckR> {
    if (!this.enabled) {
      return {
        available: false,
        version: null,
        releaseNotes: null,
        reason: this.ctx.isDev ? 'dev' : 'unconfigured'
      }
    }

    if (hasSquirrelFirstRun()) {
      return {
        available: false,
        version: null,
        releaseNotes: null,
        reason: 'squirrel-firstrun'
      }
    }

    const service = this
    this.checking = true
    this.error = null
    this.emit({ type: 'checking' })

    try {
      const result = await waitForCheck()
      this.checking = false
      if (result.available) {
        this.downloading = true
        this.emit({ type: 'available', version: result.version ?? '', releaseNotes: null })
      } else {
        this.emit({ type: 'not-available', version: result.version ?? '' })
      }
      return result
    } catch (error) {
      service.checking = false
      service.downloading = false
      const message = error instanceof Error ? error.message : String(error)
      service.error = message
      service.emit({ type: 'error', message })
      throw new IpcError('UPDATER_CHECK_FAILED', message)
    }
  }

  async download(): Promise<void> {
    await this.check()
  }

  install(): void {
    if (!this.enabled) {
      throw new IpcError('UPDATER_NOT_CONFIGURED', 'Updater is not configured')
    }
    if (!this.downloaded) {
      throw new IpcError('UPDATER_NO_UPDATE_DOWNLOADED', 'No update downloaded')
    }
    autoUpdater.quitAndInstall()
  }

  private wireEvents(): void {
    if (this.wired) return
    this.wired = true
    const service = this

    autoUpdater.on('checking-for-update', function () {
      service.checking = true
    })

    autoUpdater.on('update-available', function () {
      service.downloading = true
    })

    autoUpdater.on('update-downloaded', function (_event, _notes, releaseName) {
      service.checking = false
      service.downloading = false
      service.downloaded = true
      service.version = releaseName || service.version
      service.emit({ type: 'downloaded', version: service.version ?? '' })
    })

    autoUpdater.on('error', function (error: Error) {
      service.checking = false
      service.downloading = false
      const message = error instanceof Error ? error.message : String(error)
      service.error = message
      service.emit({ type: 'error', message })
    })
  }

  private emit(event: UpdaterEvent): void {
    const win = this.findWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(CHANNELS.UPDATER.EVENT, event)
  }
}

export { Service }
export type { CheckR, FindStatusR, UpdaterEvent }
