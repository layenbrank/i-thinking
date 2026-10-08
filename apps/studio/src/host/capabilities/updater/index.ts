import { type BrowserWindow } from 'electron'
import { autoUpdater, type NsisUpdater, type UpdateInfo } from 'electron-updater'

import { CHANNELS } from '@/shared/ipc/channels'
import { IpcError } from '@/shared/ipc/error'
import { type Out, type PushOut } from '@/shared/ipc/specs'
import { type Context } from '@/host/framework/context'

import { findFeedUrl } from './feed'

type FindStatusR = Out<typeof CHANNELS.UPDATER.READ>
type CheckR = Out<typeof CHANNELS.UPDATER.CHECK>
type UpdaterEvent = PushOut<typeof CHANNELS.UPDATER.EVENT>

function parseReleaseNotes(info: UpdateInfo): string | null {
  const notes = info.releaseNotes
  if (!notes) return null
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map(function (entry) {
        return typeof entry === 'string' ? entry : entry.note
      })
      .filter(Boolean)
      .join('\n')
  }
  return null
}

class Service {
  private readonly ctx: Context
  private readonly findWindow: () => BrowserWindow | null
  private checking = false
  private downloading = false
  private downloaded = false
  private progress: number | null = null
  private version: string | null = null
  private releaseNotes: string | null = null
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

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = false
    // 未签名包跳过 Authenticode（本地 / CI 无证书时仍可测 feed）
    if (process.platform === 'win32') {
      ;(autoUpdater as NsisUpdater).verifyUpdateCodeSignature = async function () {
        return null
      }
    }
    autoUpdater.setFeedURL({
      provider: 'generic',
      url: feedUrl
    })
    this.enabled = true
    this.wireEvents()
  }

  toRead(): FindStatusR {
    return {
      enabled: this.enabled,
      checking: this.checking,
      downloading: this.downloading,
      downloaded: this.downloaded,
      progress: this.progress,
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

    const service = this
    this.checking = true
    this.error = null
    this.emit({ type: 'checking' })

    return new Promise(function (resolve, reject) {
      let settled = false

      function finish(next: () => void) {
        if (settled) return
        settled = true
        autoUpdater.removeListener('update-available', onAvailable)
        autoUpdater.removeListener('update-not-available', onNotAvailable)
        autoUpdater.removeListener('error', onError)
        service.checking = false
        next()
      }

      function onAvailable(info: UpdateInfo) {
        finish(function () {
          service.version = info.version
          service.releaseNotes = parseReleaseNotes(info)
          service.emit({
            type: 'available',
            version: info.version,
            releaseNotes: service.releaseNotes
          })
          resolve({
            available: true,
            version: info.version,
            releaseNotes: service.releaseNotes
          })
        })
      }

      function onNotAvailable(info: UpdateInfo) {
        finish(function () {
          service.version = info.version
          service.emit({ type: 'not-available', version: info.version })
          resolve({
            available: false,
            version: info.version,
            releaseNotes: parseReleaseNotes(info),
            reason: 'latest'
          })
        })
      }

      function onError(error: Error) {
        finish(function () {
          const message = error instanceof Error ? error.message : String(error)
          service.error = message
          service.emit({ type: 'error', message })
          reject(new IpcError('UPDATER_CHECK_FAILED', message))
        })
      }

      autoUpdater.once('update-available', onAvailable)
      autoUpdater.once('update-not-available', onNotAvailable)
      autoUpdater.once('error', onError)
      void autoUpdater.checkForUpdates().catch(function (error: unknown) {
        // checkForUpdates 自身 reject 时不一定再发 error 事件
        onError(error instanceof Error ? error : new Error(String(error)))
      })
    })
  }

  async download(): Promise<void> {
    if (!this.enabled) {
      throw new IpcError('UPDATER_NOT_CONFIGURED', 'Updater is not configured')
    }

    // 兼容旧语义：尚未 check 时先检查；有更新再拉包
    if (!this.version) {
      const checked = await this.check()
      if (!checked.available) return
    }

    this.downloading = true
    this.progress = 0
    this.error = null

    try {
      await autoUpdater.downloadUpdate()
    } catch (error) {
      this.downloading = false
      this.progress = null
      const message = error instanceof Error ? error.message : String(error)
      this.error = message
      this.emit({ type: 'error', message })
      throw new IpcError('UPDATER_DOWNLOAD_FAILED', message)
    }
  }

  install(): void {
    if (!this.enabled) {
      throw new IpcError('UPDATER_NOT_CONFIGURED', 'Updater is not configured')
    }
    if (!this.downloaded) {
      throw new IpcError('UPDATER_NO_UPDATE_DOWNLOADED', 'No update downloaded')
    }
    // isSilent=false：NSIS 向导；isForceRunAfter=true：装完拉起
    autoUpdater.quitAndInstall(false, true)
  }

  private wireEvents(): void {
    if (this.wired) return
    this.wired = true
    const service = this

    autoUpdater.on('download-progress', function (progress) {
      service.downloading = true
      service.progress = Math.round(progress.percent)
    })

    autoUpdater.on('update-downloaded', function (info) {
      service.checking = false
      service.downloading = false
      service.downloaded = true
      service.progress = 100
      service.version = info.version || service.version
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
