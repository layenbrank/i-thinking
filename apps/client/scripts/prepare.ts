/**
 * 构建前准备 sidecar / 工具二进制：优先本地 CARGO_TARGET_DIR，否则按架构从 Release 下载。
 * corex Release（≥ v2.1.1）zip 含：corex.exe（CLI）+ corex-serve.exe（sidecar）+ pdfium.dll。
 * 本脚本只落盘 corex-serve + pdfium（按文件名精确匹配，勿与 corex CLI 混淆）。
 * 源文件在 src-tauri/binaries/；打包时 tauri.conf 将 pdfium.dll 映射到 $RESOURCE/pdfium.dll
 * （与 corex-serve.exe 同级，符合 serve 旁加载约定；无需 COREX_PDFIUM_DIR）。
 * pandoc / ffmpeg / ffprobe 仍以 binaries/ 子路径进 resources。
 * 校验以 Release 的 SHA256SUMS.txt 为准；本地 binaries/SHA256SUMS 仅 remap 落盘名供 CI。
 *
 * 用法（在 apps/client 目录）：
 *   bun run scripts/prepare.ts
 *   bun run scripts/prepare.ts --strict   # pandoc / ffmpeg 下载失败也退出（corex 始终必需）
 *   bun run scripts/prepare.ts --force    # 强制按 COREX_VERSION 重新下载 sidecar
 *
 * 环境变量：
 *   CARGO_TARGET_DIR  — 可选；存在 release/corex-serve 时优先于远端下载（仅开发）
 */

import { execSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs, { createWriteStream } from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '..')
const TAURI_DIR = path.join(CLIENT_DIR, 'src-tauri')
const BINARIES_DIR = path.join(TAURI_DIR, 'binaries')
const CACHE_DIR = path.join(CLIENT_DIR, '.cache', 'prepare')
const SHA256SUMS_PATH = path.join(BINARIES_DIR, 'SHA256SUMS')
const LOG_PREFIX = '[prepare]'

const EXE_SUFFIX = process.platform === 'win32' ? '.exe' : ''
const HOST_TRIPLE = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
const COREX_SERVE_NAME = `corex-serve${EXE_SUFFIX}`
const COREX_DEST = path.join(BINARIES_DIR, `corex-serve-${HOST_TRIPLE}${EXE_SUFFIX}`)
const COREX_DEST_BASENAME = path.basename(COREX_DEST)
const PDFIUM_DEST = path.join(BINARIES_DIR, 'pdfium.dll')
const PDFIUM_BASENAME = 'pdfium.dll'
const PANDOC_DEST = path.join(BINARIES_DIR, `pandoc${EXE_SUFFIX}`)
const FFMPEG_DEST = path.join(BINARIES_DIR, `ffmpeg${EXE_SUFFIX}`)
const FFPROBE_DEST = path.join(BINARIES_DIR, `ffprobe${EXE_SUFFIX}`)

const COREX_VERSION = 'v2.1.2'
const PANDOC_VERSION = '3.10.1'
const COREX_REPO = 'layenbrank/corex'
const PANDOC_REPO = 'jgm/pandoc'
const FFMPEG_REPO = 'BtbN/FFmpeg-Builds'
const FFMPEG_TAG = 'latest'
const DOWNLOAD_RETRIES = 3

const IS_STRICT = process.argv.slice(2).includes('--strict')
const IS_FORCE = process.argv.slice(2).includes('--force')

type HostKey = 'win32-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'linux-arm64'

type ChecksumKind = 'file' | 'sums'

type ReleaseAsset = {
  url: string
  archiveName: string
  checksumUrl?: string
  checksumKind?: ChecksumKind
}

type StageCopy = {
  candidates: string[]
  dest: string
}

const HOST_KEYS = new Set<string>([
  'win32-x64',
  'darwin-arm64',
  'darwin-x64',
  'linux-x64',
  'linux-arm64'
])

const PANDOC_ARCHIVES: Record<HostKey, string> = {
  'win32-x64': `pandoc-${PANDOC_VERSION}-windows-x86_64.zip`,
  'darwin-arm64': `pandoc-${PANDOC_VERSION}-arm64-macOS.zip`,
  'darwin-x64': `pandoc-${PANDOC_VERSION}-x86_64-macOS.zip`,
  'linux-x64': `pandoc-${PANDOC_VERSION}-linux-amd64.tar.gz`,
  'linux-arm64': `pandoc-${PANDOC_VERSION}-linux-arm64.tar.gz`
}

const FFMPEG_ARCHIVES: Partial<Record<HostKey, string>> = {
  'win32-x64': 'ffmpeg-master-latest-win64-gpl.zip',
  'linux-x64': 'ffmpeg-master-latest-linux64-gpl.tar.xz',
  'linux-arm64': 'ffmpeg-master-latest-linuxarm64-gpl.tar.xz'
}

let cachedCurlBin: string | null | undefined

function findHostKey(platform = process.platform, arch = process.arch): HostKey | null {
  const key = `${platform}-${arch}`
  return HOST_KEYS.has(key) ? (key as HostKey) : null
}

function findGithubAssetUrl(repo: string, tag: string, archiveName: string): string {
  return `https://github.com/${repo}/releases/download/${tag}/${archiveName}`
}

/** Release 清单缓存路径（与官方 SHA256SUMS.txt 同内容，按 tag 分文件）。 */
function findCorexSumsCachePath(): string {
  return path.join(CACHE_DIR, `SHA256SUMS-${COREX_VERSION}.txt`)
}

/**
 * corex Release 资产（见 https://github.com/layenbrank/corex/releases ）。
 * v2.1.1+：zip + SHA256SUMS.txt（包内文件与 zip 自身校验）。
 */
function findCorexAsset(host: HostKey | null): ReleaseAsset | null {
  if (host !== 'win32-x64') return null
  const archiveName = `corex-${COREX_VERSION}-windows-x64.zip`
  return {
    url: findGithubAssetUrl(COREX_REPO, COREX_VERSION, archiveName),
    archiveName,
    checksumUrl: findGithubAssetUrl(COREX_REPO, COREX_VERSION, 'SHA256SUMS.txt'),
    checksumKind: 'sums'
  }
}

function findPandocAsset(host: HostKey | null): ReleaseAsset | null {
  if (!host) return null
  const archiveName = PANDOC_ARCHIVES[host]
  return {
    url: findGithubAssetUrl(PANDOC_REPO, PANDOC_VERSION, archiveName),
    archiveName
  }
}

function findFfmpegAsset(host: HostKey | null): ReleaseAsset | null {
  if (!host) return null
  const archiveName = FFMPEG_ARCHIVES[host]
  if (!archiveName) return null
  return {
    url: findGithubAssetUrl(FFMPEG_REPO, FFMPEG_TAG, archiveName),
    archiveName,
    checksumUrl: findGithubAssetUrl(FFMPEG_REPO, FFMPEG_TAG, 'checksums.sha256'),
    checksumKind: 'sums'
  }
}

/** 仅从 CARGO_TARGET_DIR 查找 corex-serve release 产物。 */
function findCorexServePath(): string | null {
  const cargoTargetDir = process.env.CARGO_TARGET_DIR
  if (!cargoTargetDir) return null

  const candidates = [
    path.join(cargoTargetDir, HOST_TRIPLE, 'release', COREX_SERVE_NAME),
    path.join(cargoTargetDir, 'release', COREX_SERVE_NAME)
  ]

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate
  }
  return null
}

function hasNonEmptyFile(filePath: string): boolean {
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).size > 0
  } catch {
    return false
  }
}

/** 下载并缓存当前 COREX_VERSION 的 Release SHA256SUMS.txt。 */
async function ensureCorexReleaseSums(): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const dest = findCorexSumsCachePath()
  if (!hasNonEmptyFile(dest)) {
    await downloadFile(findGithubAssetUrl(COREX_REPO, COREX_VERSION, 'SHA256SUMS.txt'), dest)
  }
  return dest
}

/** 离线兜底：本地 binaries/SHA256SUMS 与落盘文件一致。 */
function matchesLocalChecksums(): boolean {
  if (!hasNonEmptyFile(COREX_DEST) || !hasNonEmptyFile(SHA256SUMS_PATH)) return false
  const expectedServe = parseSha256FromChecksum(
    fs.readFileSync(SHA256SUMS_PATH, 'utf8'),
    COREX_DEST_BASENAME,
    'sums'
  )
  if (!expectedServe || hashFileSha256(COREX_DEST) !== expectedServe) return false
  if (!hasNonEmptyFile(PDFIUM_DEST)) return true
  const expectedPdfium = parseSha256FromChecksum(
    fs.readFileSync(SHA256SUMS_PATH, 'utf8'),
    PDFIUM_BASENAME,
    'sums'
  )
  return !expectedPdfium || hashFileSha256(PDFIUM_DEST) === expectedPdfium
}

/**
 * 已落盘 sidecar 是否匹配当前 COREX_VERSION（对照 Release SHA256SUMS.txt）。
 * 无网络且无缓存时，退化为校验本地 binaries/SHA256SUMS。
 */
async function hasMatchingCorexSidecar(): Promise<boolean> {
  if (!hasNonEmptyFile(COREX_DEST)) return false
  try {
    const sumsText = fs.readFileSync(await ensureCorexReleaseSums(), 'utf8')
    const expectedServe = parseSha256FromChecksum(sumsText, COREX_SERVE_NAME, 'sums')
    if (!expectedServe || hashFileSha256(COREX_DEST) !== expectedServe) return false
    if (!hasNonEmptyFile(PDFIUM_DEST)) return true
    const expectedPdfium = parseSha256FromChecksum(sumsText, PDFIUM_BASENAME, 'sums')
    return !expectedPdfium || hashFileSha256(PDFIUM_DEST) === expectedPdfium
  } catch {
    return matchesLocalChecksums()
  }
}

/** 用 Release 清单校验已落盘的 corex-serve / pdfium。 */
function assertSidecarMatchesReleaseSums(sumsText: string): void {
  const expectedServe = parseSha256FromChecksum(sumsText, COREX_SERVE_NAME, 'sums')
  if (!expectedServe) {
    throw new Error(`Release SHA256SUMS.txt 缺少 ${COREX_SERVE_NAME}`)
  }
  const actualServe = hashFileSha256(COREX_DEST)
  if (actualServe !== expectedServe) {
    throw new Error(
      `SHA-256 mismatch for ${COREX_DEST_BASENAME}: expected ${expectedServe} got ${actualServe}`
    )
  }
  if (!hasNonEmptyFile(PDFIUM_DEST)) return
  const expectedPdfium = parseSha256FromChecksum(sumsText, PDFIUM_BASENAME, 'sums')
  if (!expectedPdfium) return
  const actualPdfium = hashFileSha256(PDFIUM_DEST)
  if (actualPdfium !== expectedPdfium) {
    throw new Error(
      `SHA-256 mismatch for ${PDFIUM_BASENAME}: expected ${expectedPdfium} got ${actualPdfium}`
    )
  }
  console.log(`${LOG_PREFIX} checksum ok ${COREX_SERVE_NAME} / ${PDFIUM_BASENAME}`)
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function warnOrFail(label: string, error: unknown): void {
  const message = formatError(error)
  if (IS_STRICT) throw error instanceof Error ? error : new Error(message)
  console.warn(`${LOG_PREFIX} ${label}: ${message}`)
}

function removeIfExists(filePath: string): void {
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
}

function copyPdfiumDll(serveSrc: string): void {
  const pdfiumSrc = path.join(path.dirname(serveSrc), 'pdfium.dll')
  if (!fs.existsSync(pdfiumSrc)) {
    console.warn(`${LOG_PREFIX} pdfium.dll 未找到: ${pdfiumSrc}`)
    return
  }
  fs.copyFileSync(pdfiumSrc, PDFIUM_DEST)
  console.log(`${LOG_PREFIX} ${pdfiumSrc} -> ${PDFIUM_DEST}`)
}

function printMissingHint(): void {
  console.error('可设置 CARGO_TARGET_DIR 指向本地 corex release，或检查网络以下载 GitHub Release')
  console.error(`corex: https://github.com/${COREX_REPO}/releases/tag/${COREX_VERSION}`)
}

/** 计算文件 SHA-256（小写 hex）。 */
function hashFileSha256(filePath: string): string {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex')
}

/**
 * 写入 binaries/SHA256SUMS：`hash␠␠filename`（落盘名；CI 校验）。
 * 仅应在真实 sidecar 复制成功后调用。
 */
function writeSidecarChecksums(): void {
  if (!fs.existsSync(COREX_DEST)) {
    throw new Error(`missing sidecar for checksums: ${COREX_DEST}`)
  }
  const lines = [`${hashFileSha256(COREX_DEST)}  ${COREX_DEST_BASENAME}`]
  if (fs.existsSync(PDFIUM_DEST)) {
    lines.push(`${hashFileSha256(PDFIUM_DEST)}  ${PDFIUM_BASENAME}`)
  }
  fs.writeFileSync(SHA256SUMS_PATH, lines.join('\n') + '\n', 'utf8')
  console.log(`${LOG_PREFIX} wrote ${SHA256SUMS_PATH}`)
}

function copySidecar(src: string): void {
  fs.mkdirSync(BINARIES_DIR, { recursive: true })
  fs.copyFileSync(src, COREX_DEST)
  copyPdfiumDll(src)
  writeSidecarChecksums()
  console.log(`${LOG_PREFIX} ${src} -> ${COREX_DEST}`)
}

/**
 * 单次 BFS：按 candidates 优先级返回第一个命中文件。
 */
function findFilePrefer(rootDir: string, candidates: string[]): string | null {
  const rank = new Map<string, number>()
  for (let i = 0; i < candidates.length; i += 1) {
    rank.set(candidates[i].toLowerCase(), i)
  }

  let bestPath: string | null = null
  let bestRank = Number.POSITIVE_INFINITY
  const queue = [rootDir]

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
    } catch {
      continue
    }

    for (const entry of entries) {
      const full = path.join(current, entry.name)
      if (entry.isDirectory()) {
        queue.push(full)
        continue
      }
      if (!entry.isFile()) continue

      const matched = rank.get(entry.name.toLowerCase())
      if (matched === undefined || matched >= bestRank) continue
      bestRank = matched
      bestPath = full
      if (bestRank === 0) return bestPath
    }
  }

  return bestPath
}

function findCurlBin(): string | null {
  if (cachedCurlBin !== undefined) return cachedCurlBin

  const curl = process.platform === 'win32' ? 'curl.exe' : 'curl'
  const probe = spawnSync(curl, ['--version'], { encoding: 'utf8' })
  cachedCurlBin = probe.error || (probe.status !== 0 && probe.status !== null) ? null : curl
  return cachedCurlBin
}

function downloadWithCurl(url: string, partialPath: string): boolean {
  const curl = findCurlBin()
  if (!curl) return false

  const result = spawnSync(
    curl,
    [
      '-fL',
      '--retry',
      '3',
      '--retry-delay',
      '2',
      '--connect-timeout',
      '30',
      '-o',
      partialPath,
      url
    ],
    { encoding: 'utf8' }
  )
  if (result.status !== 0) {
    throw new Error(`curl failed: ${result.stderr || result.stdout || result.status}`)
  }
  if (!hasNonEmptyFile(partialPath)) {
    throw new Error('curl finished but output file is empty')
  }
  return true
}

async function downloadOnce(url: string, partialPath: string): Promise<void> {
  if (downloadWithCurl(url, partialPath)) return

  const response = await fetch(url)
  if (!response.ok || !response.body) {
    throw new Error(`download failed ${response.status} ${response.statusText}: ${url}`)
  }
  await pipeline(Readable.fromWeb(response.body as never), createWriteStream(partialPath))
}

async function downloadFile(url: string, destPath: string): Promise<void> {
  fs.mkdirSync(path.dirname(destPath), { recursive: true })
  const partial = `${destPath}.partial`
  removeIfExists(partial)

  let lastError: unknown
  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    try {
      console.log(`${LOG_PREFIX} downloading (${attempt}/${DOWNLOAD_RETRIES}) ${url}`)
      await downloadOnce(url, partial)
      fs.renameSync(partial, destPath)
      return
    } catch (error) {
      lastError = error
      removeIfExists(partial)
      console.warn(`${LOG_PREFIX} download attempt ${attempt} failed: ${formatError(error)}`)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function parseSha256FromChecksum(
  text: string,
  archiveName: string,
  kind: ChecksumKind
): string | null {
  const lines = text
    .split(/\r?\n/)
    .map(function (line) {
      return line.trim()
    })
    .filter(Boolean)

  for (const line of lines) {
    const match = line.match(/^([a-fA-F0-9]{64})\s+\*?(\S+)$/)
    if (!match) continue
    const hash = match[1].toLowerCase()
    const name = path.basename(match[2])
    if (kind === 'file' || name === archiveName) return hash
  }

  if (kind === 'file' && lines.length === 1) {
    const only = lines[0].match(/^([a-fA-F0-9]{64})\b/)
    if (only) return only[1].toLowerCase()
  }

  return null
}

async function verifyArchiveChecksum(archivePath: string, asset: ReleaseAsset): Promise<void> {
  if (!asset.checksumUrl || !asset.checksumKind) return

  const checksumCache =
    asset.checksumUrl.endsWith('/SHA256SUMS.txt') && asset.archiveName.startsWith('corex-')
      ? findCorexSumsCachePath()
      : path.join(CACHE_DIR, `${asset.archiveName}.checksum`)
  if (!hasNonEmptyFile(checksumCache)) {
    try {
      await downloadFile(asset.checksumUrl, checksumCache)
    } catch (error) {
      if (IS_STRICT) throw error
      console.warn(`${LOG_PREFIX} checksum download skipped: ${formatError(error)}`)
      return
    }
  }

  const expected = parseSha256FromChecksum(
    fs.readFileSync(checksumCache, 'utf8'),
    asset.archiveName,
    asset.checksumKind
  )
  if (!expected) {
    const message = `无法从校验文件解析 ${asset.archiveName} 的 SHA-256`
    if (IS_STRICT) throw new Error(message)
    console.warn(`${LOG_PREFIX} ${message}`)
    return
  }

  const actual = hashFileSha256(archivePath)
  if (actual !== expected) {
    throw new Error(`SHA-256 mismatch for ${asset.archiveName}: expected ${expected} got ${actual}`)
  }
  console.log(`${LOG_PREFIX} checksum ok ${asset.archiveName}`)
}

async function ensureCachedArchive(asset: ReleaseAsset): Promise<string> {
  fs.mkdirSync(CACHE_DIR, { recursive: true })
  const archivePath = path.join(CACHE_DIR, asset.archiveName)

  for (let attempt = 1; attempt <= DOWNLOAD_RETRIES; attempt += 1) {
    if (!hasNonEmptyFile(archivePath)) {
      await downloadFile(asset.url, archivePath)
    } else {
      console.log(`${LOG_PREFIX} cache hit ${archivePath}`)
    }

    if (!asset.checksumUrl || !asset.checksumKind) return archivePath

    try {
      await verifyArchiveChecksum(archivePath, asset)
      return archivePath
    } catch (error) {
      removeIfExists(archivePath)
      console.warn(
        `${LOG_PREFIX} archive rejected (${attempt}/${DOWNLOAD_RETRIES}): ${formatError(error)}`
      )
      if (attempt === DOWNLOAD_RETRIES) throw error
    }
  }

  return archivePath
}

function runCommand(command: string, args: string[]): { ok: boolean; detail: string } {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  const detail = result.stderr || result.stdout || String(result.status)
  return { ok: result.status === 0, detail }
}

function extractArchive(archivePath: string, extractDir: string): void {
  fs.rmSync(extractDir, { recursive: true, force: true })
  fs.mkdirSync(extractDir, { recursive: true })

  const tar = runCommand('tar', ['-xf', archivePath, '-C', extractDir])
  if (tar.ok) return

  const lower = archivePath.toLowerCase()
  const isZip = lower.endsWith('.zip')
  const isTar = lower.endsWith('.tar.gz') || lower.endsWith('.tgz') || lower.endsWith('.tar.xz')

  if (!isZip && !isTar) {
    throw new Error(`unsupported archive: ${archivePath}`)
  }

  if (isTar) {
    throw new Error(`tar extract failed: ${tar.detail}`)
  }

  if (process.platform === 'win32') {
    const escapedArchive = archivePath.replace(/'/g, "''")
    const escapedDest = extractDir.replace(/'/g, "''")
    const ps = runCommand('powershell.exe', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -LiteralPath '${escapedArchive}' -DestinationPath '${escapedDest}' -Force`
    ])
    if (ps.ok) return
    throw new Error(`zip extract failed (tar: ${tar.detail}; Expand-Archive: ${ps.detail})`)
  }

  const unzip = runCommand('unzip', ['-o', archivePath, '-d', extractDir])
  if (!unzip.ok) throw new Error(`unzip failed: ${unzip.detail}`)
}

/**
 * 解压后扁平化：按 basename 保留 keepNames（及同批候选），提升到 extract 根目录，删除其余内容。
 * 例：.../bin/ffmpeg.exe → extract/ffmpeg/ffmpeg.exe
 */
function flattenExtractDir(extractDir: string, keepNames: string[]): void {
  const keep = new Set(
    keepNames.map(function (name) {
      return name.toLowerCase()
    })
  )
  const matched: string[] = []

  function walk(dir: string): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        walk(full)
        continue
      }
      if (entry.isFile() && keep.has(entry.name.toLowerCase())) {
        matched.push(full)
      }
    }
  }

  walk(extractDir)

  const staged = path.join(extractDir, '.flatten-staging')
  fs.rmSync(staged, { recursive: true, force: true })
  fs.mkdirSync(staged, { recursive: true })

  for (const file of matched) {
    const dest = path.join(staged, path.basename(file))
    fs.copyFileSync(file, dest)
  }

  for (const entry of fs.readdirSync(extractDir, { withFileTypes: true })) {
    const full = path.join(extractDir, entry.name)
    if (full === staged) continue
    fs.rmSync(full, { recursive: true, force: true })
  }

  for (const name of fs.readdirSync(staged)) {
    fs.renameSync(path.join(staged, name), path.join(extractDir, name))
  }
  fs.rmSync(staged, { recursive: true, force: true })
}

async function stageFromArchive(
  asset: ReleaseAsset,
  extractKey: string,
  copies: StageCopy[],
  keepNames?: string[]
): Promise<void> {
  const archivePath = await ensureCachedArchive(asset)
  const extractDir = path.join(CACHE_DIR, 'extract', extractKey)
  extractArchive(archivePath, extractDir)

  const flattenKeep =
    keepNames ??
    copies.flatMap(function (copy) {
      return copy.candidates
    })
  flattenExtractDir(extractDir, flattenKeep)

  fs.mkdirSync(BINARIES_DIR, { recursive: true })
  for (const copy of copies) {
    const src = findFilePrefer(extractDir, copy.candidates)
    if (!src) {
      throw new Error(`archive missing ${copy.candidates.join('|')}: ${asset.archiveName}`)
    }
    // zip 含 corex.exe 与 corex-serve.exe：candidates 必须精确 basename（勿用 corex 回退）
    if (path.basename(src).toLowerCase() !== copy.candidates[0].toLowerCase()) {
      throw new Error(`解压命中文件名不符: got ${path.basename(src)}, want ${copy.candidates[0]}`)
    }
    fs.copyFileSync(src, copy.dest)
    console.log(`${LOG_PREFIX} ${src} -> ${copy.dest}`)
  }
}

async function prepareCorexFromDownload(host: HostKey | null): Promise<boolean> {
  const asset = findCorexAsset(host)
  if (!asset) {
    console.warn(`${LOG_PREFIX} 当前平台无 corex Release 资产（仅 win32-x64）`)
    return false
  }

  try {
    await stageFromArchive(
      asset,
      'corex',
      [
        // 精确取 corex-serve；勿与同包 corex.exe（CLI）混淆
        { candidates: [COREX_SERVE_NAME], dest: COREX_DEST },
        { candidates: ['pdfium.dll'], dest: PDFIUM_DEST }
      ],
      [COREX_SERVE_NAME, 'pdfium.dll']
    )
    const sumsText = fs.readFileSync(await ensureCorexReleaseSums(), 'utf8')
    assertSidecarMatchesReleaseSums(sumsText)
    writeSidecarChecksums()
    return true
  } catch (error) {
    console.warn(`${LOG_PREFIX} corex 下载失败: ${formatError(error)}`)
    return false
  }
}

async function prepareOptionalTool(options: {
  label: string
  isReady: boolean
  readyMessage: string
  asset: ReleaseAsset | null
  missingMessage: string
  extractKey: string
  copies: StageCopy[]
  keepNames?: string[]
}): Promise<void> {
  if (options.isReady) {
    console.log(`${LOG_PREFIX} ${options.readyMessage}`)
    return
  }

  if (!options.asset) {
    warnOrFail(options.label, new Error(options.missingMessage))
    return
  }

  try {
    await stageFromArchive(options.asset, options.extractKey, options.copies, options.keepNames)
  } catch (error) {
    warnOrFail(`${options.label} 下载失败`, error)
  }
}

async function preparePandoc(host: HostKey | null): Promise<void> {
  await prepareOptionalTool({
    label: 'pandoc',
    isReady: hasNonEmptyFile(PANDOC_DEST),
    readyMessage: `pandoc exists ${PANDOC_DEST}`,
    asset: findPandocAsset(host),
    missingMessage: '当前平台无 pandoc 资产映射',
    extractKey: 'pandoc',
    copies: [{ candidates: [`pandoc${EXE_SUFFIX}`], dest: PANDOC_DEST }]
  })
}

async function prepareFfmpeg(host: HostKey | null): Promise<void> {
  const copies: StageCopy[] = []
  if (!hasNonEmptyFile(FFMPEG_DEST)) {
    copies.push({ candidates: [`ffmpeg${EXE_SUFFIX}`], dest: FFMPEG_DEST })
  }
  if (!hasNonEmptyFile(FFPROBE_DEST)) {
    copies.push({ candidates: [`ffprobe${EXE_SUFFIX}`], dest: FFPROBE_DEST })
  }

  const keepNames = [`ffmpeg${EXE_SUFFIX}`, `ffprobe${EXE_SUFFIX}`]

  await prepareOptionalTool({
    label: 'ffmpeg',
    isReady: copies.length === 0,
    readyMessage: `ffmpeg/ffprobe exist under ${BINARIES_DIR}`,
    asset: findFfmpegAsset(host),
    missingMessage: '当前平台无 BtbN FFmpeg 资产（macOS 需自行安装）',
    extractKey: 'ffmpeg',
    copies,
    keepNames
  })
}

async function prepareCorex(host: HostKey | null): Promise<void> {
  const cargoTargetDir = process.env.CARGO_TARGET_DIR
  const localSrc = findCorexServePath()

  if (localSrc) {
    copySidecar(localSrc)
    return
  }

  if (!IS_FORCE && (await hasMatchingCorexSidecar())) {
    console.log(`${LOG_PREFIX} corex sidecar ${COREX_VERSION} ready ${COREX_DEST}`)
    return
  }

  if (IS_FORCE) {
    console.log(`${LOG_PREFIX} --force：按 ${COREX_VERSION} 重新准备 sidecar`)
  }

  if (await prepareCorexFromDownload(host)) return

  const missingReason = !cargoTargetDir
    ? '未设置 CARGO_TARGET_DIR，且下载失败或当前平台无资产'
    : `在 CARGO_TARGET_DIR 下未找到 release/${COREX_SERVE_NAME}（当前: ${cargoTargetDir}），且下载失败`

  console.error(`${LOG_PREFIX} ${missingReason}`)
  printMissingHint()
  process.exit(1)
}

async function prepare(): Promise<void> {
  const host = findHostKey()
  await prepareCorex(host)
  await preparePandoc(host)
  await prepareFfmpeg(host)
}

const isDirectRun =
  Boolean(process.argv[1]) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  prepare().catch(function (error) {
    console.error(`${LOG_PREFIX}`, formatError(error))
    process.exit(1)
  })
}

export {
  copyPdfiumDll,
  findCorexAsset,
  findCorexServePath,
  findFfmpegAsset,
  findHostKey,
  findPandocAsset,
  hashFileSha256,
  prepare,
  writeSidecarChecksums
}
