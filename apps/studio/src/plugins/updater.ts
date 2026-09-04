import type { UpdateInfo } from 'electron-updater'
import { autoUpdater } from 'electron-updater'

import { CHANNELS } from './channels'
import type { Context } from './context'
import { registerHandler } from './handle'
import type { Plugin } from './module'

interface FindStatusR {
  enabled: boolean
  checking: boolean
  downloading: boolean
  downloaded: boolean
  progress: number | null
  version: string | null
  error: string | null
}

interface CheckR {
  available: boolean
  version: string | null
  releaseNotes: string | null
  reason?: string
}

type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string; releaseNotes: string | null }
  | { type: 'not-available'; version: string }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error'; message: string }

class Service {
  private readonly ctx: Context
  private checking = false
  private downloading = false
  private downloaded = false
  private progress: number | null = null
  private version: string | null = null
  private error: string | null = null
  private enabled = false
  private wired = false

  constructor(ctx: Context) {
    this.ctx = ctx
  }

  configure(): void {
    if (this.ctx.isDev) {
      this.enabled = false
      return
    }

    const provider = process.env.STUDIO_UPDATE_PROVIDER
    const updateUrl = process.env.STUDIO_UPDATE_URL
    const owner = process.env.STUDIO_GITHUB_OWNER ?? 'i-thinking'
    const repo = process.env.STUDIO_GITHUB_REPO ?? 'i-thinking'

    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    if (provider === 'generic' && updateUrl) {
      autoUpdater.setFeedURL({ provider: 'generic', url: updateUrl })
      this.enabled = true
    } else if (provider === 'github') {
      autoUpdater.setFeedURL({
        provider: 'github',
        owner,
        repo
      })
      this.enabled = true
    } else if (updateUrl) {
      autoUpdater.setFeedURL({ provider: 'generic', url: updateUrl })
      this.enabled = true
    } else {
      this.enabled = false
      this.ctx.logger
        .child('updater')
        .info('disabled: set STUDIO_UPDATE_PROVIDER / STUDIO_UPDATE_URL')
      return
    }

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

    this.checking = true
    this.error = null
    this.emit({ type: 'checking' })

    try {
      const result = await autoUpdater.checkForUpdates()
      this.checking = false
      if (!result?.updateInfo) {
        return {
          available: false,
          version: null,
          releaseNotes: null,
          reason: 'no-update-info'
        }
      }

      const info = result.updateInfo
      const current = this.ctx.app.getVersion()
      const available = info.version !== current
      this.version = info.version

      if (!available) {
        this.emit({ type: 'not-available', version: info.version })
        return {
          available: false,
          version: info.version,
          releaseNotes: parseReleaseNotes(info),
          reason: 'latest'
        }
      }

      this.emit({
        type: 'available',
        version: info.version,
        releaseNotes: parseReleaseNotes(info)
      })
      return {
        available: true,
        version: info.version,
        releaseNotes: parseReleaseNotes(info)
      }
    } catch (error) {
      this.checking = false
      const message = error instanceof Error ? error.message : String(error)
      this.error = message
      this.emit({ type: 'error', message })
      throw error
    }
  }

  async download(): Promise<void> {
    if (!this.enabled) {
      throw new Error('Updater is not configured')
    }
    this.downloading = true
    this.downloaded = false
    this.progress = 0
    this.error = null
    await autoUpdater.downloadUpdate()
  }

  install(): void {
    if (!this.enabled) {
      throw new Error('Updater is not configured')
    }
    if (!this.downloaded) {
      throw new Error('No update downloaded')
    }
    autoUpdater.quitAndInstall(false, true)
  }

  private wireEvents(): void {
    if (this.wired) return
    this.wired = true
    const service = this

    autoUpdater.on('download-progress', function (progress: { percent: number }) {
      service.progress = progress.percent
      service.emit({ type: 'progress', percent: progress.percent })
    })

    autoUpdater.on('update-downloaded', function (info: { version: string }) {
      service.downloading = false
      service.downloaded = true
      service.progress = 100
      service.version = info.version
      service.emit({ type: 'downloaded', version: info.version })
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
    const win = this.ctx.toReadWindow()
    if (!win || win.isDestroyed()) return
    win.webContents.send(CHANNELS.UPDATER.EVENT, event)
  }
}

function parseReleaseNotes(info: UpdateInfo): string | null {
  const notes = info.releaseNotes
  if (!notes) return null
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map(function (item) {
        return typeof item === 'string' ? item : item.note
      })
      .filter(Boolean)
      .join('\n')
  }
  return null
}

function buildPlugin(): Plugin {
  return {
    name: 'updater',
    register(ctx: Context) {
      const service = new Service(ctx)
      service.configure()
      registerHandler(ctx, CHANNELS.UPDATER.READ, null, function () {
        return service.toRead()
      })
      registerHandler(ctx, CHANNELS.UPDATER.CHECK, null, function () {
        return service.check()
      })
      registerHandler(ctx, CHANNELS.UPDATER.DOWNLOAD, null, async function () {
        await service.download()
      })
      registerHandler(ctx, CHANNELS.UPDATER.INSTALL, null, function () {
        service.install()
      })
      ctx.logger.child('updater').info('registered', service.toRead())
    }
  }
}

export { buildPlugin, Service }
export type { CheckR, FindStatusR, UpdaterEvent }
