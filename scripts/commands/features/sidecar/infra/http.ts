import { createWriteStream, existsSync, mkdirSync, renameSync, statSync, unlinkSync } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

import chalk from 'chalk'
import ky, { type KyInstance, type Progress } from 'ky'

const DOWNLOAD_RETRIES = 3
const DOWNLOAD_TIMEOUT_MS = 120_000
const PROGRESS_INTERVAL_MS = 200
const BAR_WIDTH = 24
const LOG_PREFIX = '[download]'

/**
 * 对齐已删除的 apps/client/scripts/prepare/http.ts（ky.create，无鉴权）。
 * 重试逻辑在 downloadToFile。
 */
function createHttpClient(): KyInstance {
  return ky.create({
    timeout: DOWNLOAD_TIMEOUT_MS,
    retry: { limit: 0 },
    headers: { 'User-Agent': 'i-thinking-sidecar' }
  })
}

const http = createHttpClient()

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

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
  if (process.stderr.isTTY) {
    process.stderr.write('\n')
  }
}

function createProgressReporter(): (progress: Progress) => void {
  let lastAt = 0
  let lastLoggedPercent = -1

  return function onProgress(progress: Progress): void {
    const now = Date.now()
    const percent = Math.min(100, Math.round(progress.percent * 100))

    if (process.stderr.isTTY) {
      if (now - lastAt < PROGRESS_INTERVAL_MS && percent < 100) {
        return
      }
      lastAt = now
      renderProgressBar(progress)
      return
    }

    if (percent === lastLoggedPercent || (percent < 100 && now - lastAt < 2000)) {
      return
    }
    lastAt = now
    lastLoggedPercent = percent
    console.log(
      `${LOG_PREFIX} ${percent}% ${formatBytes(progress.transferredBytes)}` +
        (progress.totalBytes > 0 ? ` / ${formatBytes(progress.totalBytes)}` : '')
    )
  }
}

function removeFile(filePath: string): void {
  if (existsSync(filePath)) {
    unlinkSync(filePath)
  }
}

function hasFilledFile(filePath: string): boolean {
  return existsSync(filePath) && statSync(filePath).size > 0
}

async function downloadOnce(url: string, partialPath: string): Promise<void> {
  const report = createProgressReporter()
  const response = await http.get(url, {
    onDownloadProgress(progress) {
      report(progress)
    }
  })

  if (!response.body) {
    throw new Error(`${LOG_PREFIX} 响应体为空 ${url}`)
  }

  try {
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(partialPath))
  } finally {
    finishProgressLine()
  }

  if (!hasFilledFile(partialPath)) {
    throw new Error(`${LOG_PREFIX} 下载结束但文件为空`)
  }
}

/** 流式下载到目标路径；同一 URL 内重试。 */
async function downloadToFile(url: string, destPath: string): Promise<void> {
  mkdirSync(path.dirname(destPath), { recursive: true })
  const partial = `${destPath}.partial`
  removeFile(partial)

  let lastError: unknown
  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt++) {
    try {
      if (attempt === 1) {
        console.log(chalk.cyan(`${LOG_PREFIX} ${url}`))
      } else {
        console.log(chalk.yellow(`${LOG_PREFIX} 重试 ${attempt}/${DOWNLOAD_RETRIES}`))
      }
      await downloadOnce(url, partial)
      renameSync(partial, destPath)
      console.log(
        chalk.green(`${LOG_PREFIX} 已保存 ${destPath}（${formatBytes(statSync(destPath).size)}）`)
      )
      return
    } catch (error) {
      lastError = error
      removeFile(partial)
      if (attempt === DOWNLOAD_RETRIES) {
        console.log(chalk.red(`${LOG_PREFIX} 失败: ${String(error)}`))
      }
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

export { downloadToFile, formatBytes, http }
