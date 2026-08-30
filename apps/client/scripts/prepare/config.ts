import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '../..')
const TAURI_DIR = path.join(CLIENT_DIR, 'src-tauri')
const BINARIES_DIR = path.join(TAURI_DIR, 'binaries')
const CACHE_DIR = path.join(CLIENT_DIR, '.cache', 'prepare')
const SHA256SUMS_PATH = path.join(BINARIES_DIR, 'SHA256SUMS')
const LOG_PREFIX = '[prepare]'

const EXE_SUFFIX = process.platform === 'win32' ? '.exe' : ''
const HOST_TRIPLE = execSync('rustc --print host-tuple', { encoding: 'utf8' }).trim()
const DOWNLOAD_RETRIES = 3
const DOWNLOAD_TIMEOUT_MS = 120_000

type HostKey = 'win32-x64' | 'darwin-arm64' | 'darwin-x64' | 'linux-x64' | 'linux-arm64'
type ArtifactId = 'corex' | 'pandoc' | 'ffmpeg'
type ChecksumKind = 'file' | 'sums'

type RemoteAsset = {
  archiveName: string
  canonicalUrl: string
  checksumCanonicalUrl?: string
  checksumKind?: ChecksumKind
  /** 校验文件在 CACHE_DIR 下的文件名；缺省为 `${archiveName}.checksum` */
  checksumCacheName?: string
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

const COREX_SERVE_NAME = `corex-daemon${EXE_SUFFIX}`
const COREX_DEST = path.join(BINARIES_DIR, `corex-daemon-${HOST_TRIPLE}${EXE_SUFFIX}`)
const COREX_DEST_BASENAME = path.basename(COREX_DEST)
const PDFIUM_DEST = path.join(BINARIES_DIR, 'pdfium.dll')
const PDFIUM_BASENAME = 'pdfium.dll'
const PANDOC_DEST = path.join(BINARIES_DIR, `pandoc${EXE_SUFFIX}`)
const FFMPEG_DEST = path.join(BINARIES_DIR, `ffmpeg${EXE_SUFFIX}`)
const FFPROBE_DEST = path.join(BINARIES_DIR, `ffprobe${EXE_SUFFIX}`)

function findHostKey(platform = process.platform, arch = process.arch): HostKey | null {
  const key = `${platform}-${arch}`
  return HOST_KEYS.has(key) ? (key as HostKey) : null
}

function findGithubAssetUrl(repo: string, tag: string, archiveName: string): string {
  return `https://github.com/${repo}/releases/download/${tag}/${archiveName}`
}

export {
  BINARIES_DIR,
  CACHE_DIR,
  COREX_DEST,
  COREX_DEST_BASENAME,
  COREX_SERVE_NAME,
  DOWNLOAD_RETRIES,
  DOWNLOAD_TIMEOUT_MS,
  EXE_SUFFIX,
  FFMPEG_DEST,
  FFPROBE_DEST,
  findGithubAssetUrl,
  findHostKey,
  HOST_TRIPLE,
  LOG_PREFIX,
  PANDOC_DEST,
  PDFIUM_BASENAME,
  PDFIUM_DEST,
  SHA256SUMS_PATH,
  type ArtifactId,
  type ChecksumKind,
  type HostKey,
  type RemoteAsset,
  type StageCopy
}
