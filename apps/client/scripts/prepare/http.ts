import fs, { createWriteStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import chalk from 'chalk'
import ky, { type KyInstance, type Progress } from 'ky'
import {
  DOWNLOAD_RETRIES,
  DOWNLOAD_TIMEOUT_MS,
  LOG_PREFIX
} from './config.ts'
import { ensureDir, findFileSize, hasFilledFile, removeFile } from './file.ts'
import { formatBytes, formatError, log } from './log.ts'

const PROGRESS_INTERVAL_MS = 200
const BAR_WIDTH = 24

/**
 * 对齐前端 `ky.create` 封装（无 auth / VITE prefix）。
 * 重试由 downloadToFile / 多源链负责。
 */
function HttpClient(): KyInstance {
  return ky.create({
    timeout: DOWNLOAD_TIMEOUT_MS,
    retry: { limit: 0 },
    hooks: {
      init: [],
      beforeRequest: [],
      afterResponse: [],
      beforeError: [],
      beforeRetry: []
    }
  })
}

const http = HttpClient()

function renderProgressBar(progress: Progress): void {
  const percent = Math.min(100, Math.round(progress.percent * 100))
  const filled = Math.round((percent / 100) * BAR_WIDTH)
  const bar = `${'█'.repeat(filled)}${'░'.repeat(BAR_WIDTH - filled)}`
  const totalLabel =
    progress.totalBytes > 0
      ? `${formatBytes(progress.transferredBytes)} / ${formatBytes(progress.totalBytes)}`
      : formatBytes(progress.transferredBytes)
  const line = chalk.cyan(`${LOG_PREFIX} [${bar}] ${percent}%  ${totalLabel}`)
  if (process.stderr.isTTY) {
    process.stderr.write(`\r${line.padEnd(100)}`)
  }
}

function finishProgressLine(): void {
  if (process.stderr.isTTY) process.stderr.write('\n')
}

function createProgressReporter(): (progress: Progress) => void {
  let lastAt = 0
  let lastLoggedPercent = -1

  return function onProgress(progress: Progress): void {
    const now = Date.now()
    const percent = Math.min(100, Math.round(progress.percent * 100))

    if (process.stderr.isTTY) {
      if (now - lastAt < PROGRESS_INTERVAL_MS && percent < 100) return
      lastAt = now
      renderProgressBar(progress)
      return
    }

    if (percent === lastLoggedPercent || (percent < 100 && now - lastAt < 2000)) return
    lastAt = now
    lastLoggedPercent = percent
    log.info(
      `download ${percent}% ${formatBytes(progress.transferredBytes)}` +
        (progress.totalBytes > 0 ? ` / ${formatBytes(progress.totalBytes)}` : '')
    )
  }
}

async function downloadOnce(url: string, partialPath: string): Promise<void> {
  const report = createProgressReporter()
  const response = await http.get(url, {
    onDownloadProgress(progress) {
      report(progress)
    }
  })

  if (!response.body) {
    throw new Error(`download failed: empty body ${url}`)
  }

  try {
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(partialPath))
  } finally {
    finishProgressLine()
  }

  if (!hasFilledFile(partialPath)) {
    throw new Error('download finished but output file is empty')
  }
}

/** 流式下载到 dest；单 URL 内按 DOWNLOAD_RETRIES 重试。 */
async function downloadToFile(url: string, destPath: string): Promise<void> {
  ensureDir(path.dirname(destPath))
  const partial = `${destPath}.partial`
  removeFile(partial)

  let lastError: unknown
  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    try {
      if (attempt === 1) {
        log.info(`下载 ${url}`)
      } else {
        log.warn(`重试下载 (${attempt}/${DOWNLOAD_RETRIES}) ${url}`)
      }
      await downloadOnce(url, partial)
      fs.renameSync(partial, destPath)
      log.success(`已保存 ${destPath}（${formatBytes(findFileSize(destPath))}）`)
      return
    } catch (error) {
      lastError = error
      removeFile(partial)
      log.debug(`下载失败 (${attempt}/${DOWNLOAD_RETRIES}): ${formatError(error)}`)
      if (attempt === DOWNLOAD_RETRIES) {
        log.warn(`下载失败: ${formatError(error)}`)
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export { downloadToFile, http }
