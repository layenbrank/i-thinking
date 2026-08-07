import path from 'node:path'
import { assertFileMatchesHash, parseSha256FromChecksum } from '../checksum.ts'
import {
  CACHE_DIR,
  COREX_DEST,
  COREX_DEST_BASENAME,
  COREX_SERVE_NAME,
  findGithubAssetUrl,
  PDFIUM_BASENAME,
  PDFIUM_DEST,
  SHA256SUMS_PATH
} from '../config.ts'
import { stageFromArchive } from '../extract.ts'
import {
  copyFile,
  hasFilledFile,
  hasPath,
  hashSha256,
  readTextFile,
  removeFile,
  writeTextFile
} from '../file.ts'
import { log } from '../log.ts'
import { downloadUrl } from '../remote.ts'
import { findArchiveNameFor, findMergedRelease } from '../parse-sources.ts'
import { SOURCES } from '../sources.ts'
import type { ArtifactRecipe } from './types.ts'

async function ensureReleaseSums(): Promise<string> {
  const release = await findMergedRelease('corex')
  const cacheName =
    release.checksum?.cacheName ?? `SHA256SUMS-${release.tag}.txt`
  const dest = path.join(CACHE_DIR, cacheName)
  if (!hasFilledFile(dest)) {
    if (!release.checksum) {
      throw new Error('corex release 未配置 checksum')
    }
    await downloadUrl(
      findGithubAssetUrl(release.repo, release.tag, release.checksum.name),
      dest
    )
  }
  return dest
}

function matchesLocalChecksums(): boolean {
  if (!hasFilledFile(COREX_DEST) || !hasFilledFile(SHA256SUMS_PATH)) return false
  const expectedServe = parseSha256FromChecksum(
    readTextFile(SHA256SUMS_PATH),
    COREX_DEST_BASENAME,
    'sums'
  )
  if (!expectedServe || hashSha256(COREX_DEST) !== expectedServe) return false
  if (!hasFilledFile(PDFIUM_DEST)) return true
  const expectedPdfium = parseSha256FromChecksum(
    readTextFile(SHA256SUMS_PATH),
    PDFIUM_BASENAME,
    'sums'
  )
  return !expectedPdfium || hashSha256(PDFIUM_DEST) === expectedPdfium
}

async function hasMatchingSidecar(): Promise<boolean> {
  if (!hasFilledFile(COREX_DEST)) return false
  try {
    const sumsText = readTextFile(await ensureReleaseSums())
    const expectedServe = parseSha256FromChecksum(sumsText, COREX_SERVE_NAME, 'sums')
    if (!expectedServe || hashSha256(COREX_DEST) !== expectedServe) return false
    if (!hasFilledFile(PDFIUM_DEST)) return true
    const expectedPdfium = parseSha256FromChecksum(sumsText, PDFIUM_BASENAME, 'sums')
    return !expectedPdfium || hashSha256(PDFIUM_DEST) === expectedPdfium
  } catch {
    return matchesLocalChecksums()
  }
}

function writeSidecarChecksums(): void {
  if (!hasPath(COREX_DEST)) {
    throw new Error(`missing sidecar for checksums: ${COREX_DEST}`)
  }
  const lines = [`${hashSha256(COREX_DEST)}  ${COREX_DEST_BASENAME}`]
  if (hasPath(PDFIUM_DEST)) {
    lines.push(`${hashSha256(PDFIUM_DEST)}  ${PDFIUM_BASENAME}`)
  }
  writeTextFile(SHA256SUMS_PATH, lines.join('\n') + '\n')
  log.success(`已写入 ${SHA256SUMS_PATH}`)
}

function assertSidecarMatchesReleaseSums(sumsText: string): void {
  const expectedServe = parseSha256FromChecksum(sumsText, COREX_SERVE_NAME, 'sums')
  if (!expectedServe) {
    throw new Error(`Release SHA256SUMS.txt 缺少 ${COREX_SERVE_NAME}`)
  }
  assertFileMatchesHash(COREX_DEST, expectedServe, COREX_DEST_BASENAME)
  if (!hasFilledFile(PDFIUM_DEST)) return
  const expectedPdfium = parseSha256FromChecksum(sumsText, PDFIUM_BASENAME, 'sums')
  if (!expectedPdfium) return
  assertFileMatchesHash(PDFIUM_DEST, expectedPdfium, PDFIUM_BASENAME)
  log.success(`校验通过 ${COREX_SERVE_NAME} / ${PDFIUM_BASENAME}`)
}

function copyPdfiumDll(serveSrc: string): void {
  const pdfiumSrc = path.join(path.dirname(serveSrc), 'pdfium.dll')
  if (!hasPath(pdfiumSrc)) {
    log.warn(`pdfium.dll 未找到: ${pdfiumSrc}`)
    return
  }
  copyFile(pdfiumSrc, PDFIUM_DEST)
  log.success(`${pdfiumSrc} -> ${PDFIUM_DEST}`)
}

const corexRelease = SOURCES.corex.release

const corexRecipe: ArtifactRecipe = {
  id: 'corex',
  label: `corex-serve + pdfium (${COREX_DEST})`,
  isRequired: true,
  hasExisting() {
    return hasFilledFile(COREX_DEST)
  },
  isReady() {
    return hasMatchingSidecar()
  },
  stageLocal(_ctx, dirPath) {
    const servePath = path.join(dirPath, COREX_SERVE_NAME)
    if (!hasPath(servePath)) {
      throw new Error(`本地源缺少 ${COREX_SERVE_NAME}: ${dirPath}`)
    }
    copyFile(servePath, COREX_DEST)
    copyPdfiumDll(servePath)
    writeSidecarChecksums()
    log.success(`${servePath} -> ${COREX_DEST}`)
  },
  clearArtifacts(_ctx, host) {
    removeFile(COREX_DEST)
    removeFile(PDFIUM_DEST)
    const archiveName = findArchiveNameFor('corex', host)
    if (archiveName) removeFile(path.join(CACHE_DIR, archiveName))
  },
  async stageRemote(ctx, _host, asset) {
    await stageFromArchive(
      ctx,
      asset,
      'corex',
      [
        { candidates: [COREX_SERVE_NAME], dest: COREX_DEST },
        { candidates: ['pdfium.dll'], dest: PDFIUM_DEST }
      ],
      [COREX_SERVE_NAME, 'pdfium.dll']
    )
    assertSidecarMatchesReleaseSums(readTextFile(await ensureReleaseSums()))
    writeSidecarChecksums()
  },
  missingHint: `在 sources.local.ts 配置 local 源，或检查网络。corex: https://github.com/${corexRelease.repo}/releases/tag/${corexRelease.tag}`
}

export { corexRecipe }
