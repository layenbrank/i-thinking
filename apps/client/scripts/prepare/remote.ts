import path from 'node:path'
import { assertArchiveMatchesChecksum } from './checksum.ts'
import type { PrepareContext } from './command.ts'
import { CACHE_DIR, DOWNLOAD_RETRIES, type RemoteAsset } from './config.ts'
import { ensureDir, hasFilledFile, readTextFile, removeFile } from './file.ts'
import { downloadToFile } from './http.ts'
import { formatError, log } from './log.ts'

/** 依次尝试 URL 列表下载到 dest（源链已在上层展开）。 */
async function downloadFromUrls(urls: string[], destPath: string): Promise<void> {
  if (urls.length === 0) throw new Error('downloadFromUrls: 空 URL 列表')
  let lastError: unknown

  for (let i = 0; i < urls.length; i += 1) {
    const url = urls[i]
    try {
      await downloadToFile(url, destPath)
      return
    } catch (error) {
      lastError = error
      const isLast = i === urls.length - 1
      if (isLast) {
        log.warn(`全部源失败: ${formatError(error)}`)
      } else {
        log.warn(`源不可用，切换下一候选: ${formatError(error)}`)
        log.debug(`失败 URL: ${url}`)
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('全部下载源失败')
}

async function downloadUrl(url: string, destPath: string): Promise<void> {
  await downloadFromUrls([url], destPath)
}

function findChecksumCachePath(asset: RemoteAsset): string {
  const name = asset.checksumCacheName ?? `${asset.archiveName}.checksum`
  return path.join(CACHE_DIR, name)
}

async function ensureChecksumCache(
  ctx: PrepareContext,
  asset: RemoteAsset
): Promise<string | null> {
  if (!asset.checksumCanonicalUrl || !asset.checksumKind) return null
  const cachePath = findChecksumCachePath(asset)
  if (hasFilledFile(cachePath)) return cachePath
  try {
    await downloadUrl(asset.checksumCanonicalUrl, cachePath)
    return cachePath
  } catch (error) {
    if (ctx.isStrict) throw error
    log.warn(`校验清单下载已跳过: ${formatError(error)}`)
    return null
  }
}

/** 确保归档在缓存中（下载 + 可选校验）。 */
async function ensureCachedArchive(ctx: PrepareContext, asset: RemoteAsset): Promise<string> {
  ensureDir(CACHE_DIR)
  const archivePath = path.join(CACHE_DIR, asset.archiveName)

  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    if (!hasFilledFile(archivePath)) {
      await downloadUrl(asset.canonicalUrl, archivePath)
    } else {
      log.skip(`命中缓存 ${asset.archiveName}`)
      log.debug(archivePath)
    }

    if (!asset.checksumCanonicalUrl || !asset.checksumKind) return archivePath

    try {
      const checksumPath = await ensureChecksumCache(ctx, asset)
      if (checksumPath) {
        assertArchiveMatchesChecksum(
          ctx,
          archivePath,
          asset.archiveName,
          readTextFile(checksumPath),
          asset.checksumKind
        )
      }
      return archivePath
    } catch (error) {
      removeFile(archivePath)
      log.warn(`归档校验失败 (${attempt}/${DOWNLOAD_RETRIES})，将重新下载`)
      log.debug(formatError(error))
      if (attempt === DOWNLOAD_RETRIES) throw error
    }
  }

  return archivePath
}

export { downloadFromUrls, downloadUrl, ensureCachedArchive }
