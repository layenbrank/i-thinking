import { spawnSync } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const SIDECAR_ROOT = path.resolve(SCRIPT_DIR, '..')

/** Gyan full-shared: include/ + lib/ (link) + bin/*.dll (runtime). */
const FFMPEG_SHARED_URL = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-full-shared.7z'

type PlatformKey = string

function findPlatformKey(platform = process.platform, arch = process.arch): PlatformKey {
  return `${platform}-${arch}`
}

function findVendorDir(key = findPlatformKey()): string {
  return path.join(SIDECAR_ROOT, 'vendor', 'ffmpeg', key)
}

/** Root used as FFMPEG_DIR (must contain include/, lib/, bin/). */
function findVendorRoot(key = findPlatformKey()): string {
  return path.join(findVendorDir(key), 'sdk')
}

function findVendorBinDir(key = findPlatformKey()): string {
  return path.join(findVendorRoot(key), 'bin')
}

function hasFfmpegSdk(root = findVendorRoot()): boolean {
  return (
    existsSync(path.join(root, 'include', 'libavcodec', 'avcodec.h')) &&
    existsSync(path.join(root, 'lib')) &&
    existsSync(path.join(root, 'bin'))
  )
}

function findSevenZip(): string | undefined {
  const candidates = [
    '7z',
    String.raw`C:\Program Files\7-Zip\7z.exe`,
    String.raw`C:\Program Files (x86)\7-Zip\7z.exe`
  ]
  for (const candidate of candidates) {
    const probe = spawnSync(candidate, ['--help'], { encoding: 'utf8' })
    if (probe.status === 0 || probe.status === 1) {
      return candidate
    }
  }
  return undefined
}

/**
 * Ensure a local FFmpeg full-shared SDK exists under sidecar/vendor.
 * Required to build corex with ffmpeg-next and to stage runtime DLLs.
 */
async function ensureFfmpegVendor(): Promise<string> {
  const key = findPlatformKey()
  const root = findVendorRoot(key)
  if (hasFfmpegSdk(root)) {
    console.log(`[ffmpeg] vendor hit ${root}`)
    return root
  }

  if (process.platform !== 'win32' || process.arch !== 'x64') {
    throw new Error(
      `[ffmpeg] auto-fetch only supports win32-x64; place full-shared SDK at ${root} (include/lib/bin)`
    )
  }

  const sevenZip = findSevenZip()
  if (!sevenZip) {
    throw new Error('[ffmpeg] 7-Zip required to extract full-shared SDK (install 7-Zip or place SDK manually)')
  }

  const vendorDir = findVendorDir(key)
  mkdirSync(vendorDir, { recursive: true })
  const archivePath = path.join(vendorDir, 'ffmpeg-release-full-shared.7z')
  const extractDir = path.join(vendorDir, 'extract')

  if (!existsSync(archivePath)) {
    console.log(`[ffmpeg] downloading ${FFMPEG_SHARED_URL}`)
    const response = await fetch(FFMPEG_SHARED_URL)
    if (!response.ok || !response.body) {
      throw new Error(`[ffmpeg] download failed: ${response.status} ${response.statusText}`)
    }
    await pipeline(Readable.fromWeb(response.body as never), createWriteStream(archivePath))
  } else {
    console.log(`[ffmpeg] using cached archive ${archivePath}`)
  }

  rmSync(extractDir, { recursive: true, force: true })
  mkdirSync(extractDir, { recursive: true })
  const expanded = spawnSync(sevenZip, ['x', archivePath, `-o${extractDir}`, '-y'], {
    encoding: 'utf8'
  })
  if (expanded.status !== 0) {
    throw new Error(`[ffmpeg] 7z extract failed: ${expanded.stderr || expanded.stdout}`)
  }

  const extractedRoot = findExtractedSdkRoot(extractDir)
  if (!extractedRoot) {
    throw new Error('[ffmpeg] full-shared layout not found inside archive (expected include/lib/bin)')
  }

  rmSync(root, { recursive: true, force: true })
  mkdirSync(path.dirname(root), { recursive: true })
  const moved = spawnSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Move-Item -LiteralPath '${extractedRoot}' -Destination '${root}'`
  ], { encoding: 'utf8' })
  if (moved.status !== 0 || !hasFfmpegSdk(root)) {
    throw new Error(`[ffmpeg] failed to stage SDK at ${root}: ${moved.stderr || moved.stdout}`)
  }

  rmSync(extractDir, { recursive: true, force: true })
  console.log(`[ffmpeg] vendored ${root}`)
  return root
}

function findExtractedSdkRoot(extractDir: string): string | undefined {
  const queue = [extractDir]
  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) {
      break
    }
    if (hasFfmpegSdk(current)) {
      return current
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        queue.push(path.join(current, entry.name))
      }
    }
  }
  return undefined
}

/** Runtime DLLs that corex links against (copy beside corex.exe). */
function findRuntimeDlls(key = findPlatformKey()): string[] {
  const binDir = findVendorBinDir(key)
  if (!existsSync(binDir)) {
    return []
  }
  return readdirSync(binDir)
    .filter(function (name) {
      const lower = name.toLowerCase()
      return lower.endsWith('.dll') && (lower.startsWith('av') || lower.startsWith('sw') || lower.startsWith('postproc'))
    })
    .map(function (name) {
      return path.join(binDir, name)
    })
}

async function main(): Promise<void> {
  const root = await ensureFfmpegVendor()
  console.log(`[ffmpeg] ready FFMPEG_DIR=${root}`)
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(function (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}

export {
  ensureFfmpegVendor,
  findPlatformKey,
  findRuntimeDlls,
  findVendorBinDir,
  findVendorDir,
  findVendorRoot
}
