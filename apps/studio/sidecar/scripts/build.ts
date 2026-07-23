import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { ensureFfmpegVendor, findRuntimeDlls, findVendorRoot } from './fetch-ffmpeg.ts'

const SIDECAR_ROOT = path.resolve(import.meta.dirname, '..')
const MANIFEST_PATH = path.join(SIDECAR_ROOT, 'manifest.json')
const CARGO_SIDECARS = ['corex', 'generate', 'service'] as const
const CARGO_PACKAGES = ['-p', 'corex', '-p', 'generate', '-p', 'service'] as const

type SidecarAction = 'build' | 'stage' | 'verify'

type SidecarManifest = {
  sidecars: string[]
  platforms: Record<string, Record<string, string>>
}

type CargoMetadata = {
  target_directory: string
}

function findPlatformKey(platform = process.platform, arch = process.arch): string {
  return `${platform}-${arch}`
}

function findSidecarFileName(name: string, platform = process.platform): string {
  return platform === 'win32' ? `${name}.exe` : name
}

function hashFile(filePath: string): string {
  const hash = createHash('sha256')
  hash.update(readFileSync(filePath))
  return hash.digest('hex')
}

function findReleaseDir(): string {
  const meta = spawnSync('cargo', ['metadata', '--format-version', '1', '--no-deps'], {
    cwd: SIDECAR_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  })
  if (meta.status !== 0) {
    throw new Error(`[sidecar] cargo metadata failed: ${meta.stderr || meta.stdout}`)
  }
  const parsed = JSON.parse(meta.stdout) as CargoMetadata
  return path.join(parsed.target_directory, 'release')
}

function findStagedDir(key = findPlatformKey()): string {
  return path.join(SIDECAR_ROOT, 'staging', key)
}

function parseManifest(): SidecarManifest {
  if (!existsSync(MANIFEST_PATH)) {
    return { sidecars: [...CARGO_SIDECARS], platforms: {} }
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as SidecarManifest
}

function writeManifest(manifest: SidecarManifest): void {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function findLibclangPath(): string | undefined {
  const candidates = [
    process.env.LIBCLANG_PATH,
    String.raw`C:\Program Files\LLVM\bin`,
    String.raw`C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Tools\Llvm\x64\bin`,
    String.raw`C:\Program Files\Microsoft Visual Studio\2022\Professional\VC\Tools\Llvm\x64\bin`,
    String.raw`C:\Program Files\Microsoft Visual Studio\2022\Enterprise\VC\Tools\Llvm\x64\bin`
  ]
  for (const candidate of candidates) {
    if (!candidate) {
      continue
    }
    if (existsSync(path.join(candidate, 'libclang.dll'))) {
      return candidate
    }
  }
  return undefined
}

async function buildCargoRelease(): Promise<void> {
  await ensureFfmpegVendor()
  const ffmpegDir = findVendorRoot()
  const libclangPath = findLibclangPath()
  if (!libclangPath) {
    console.error(
      '[sidecar] LIBCLANG_PATH missing. Install LLVM (https://github.com/llvm/llvm-project/releases) or set LIBCLANG_PATH to the folder containing libclang.dll'
    )
    process.exit(1)
  }

  const env = {
    ...process.env,
    FFMPEG_DIR: ffmpegDir,
    LIBCLANG_PATH: libclangPath,
    PATH: `${path.join(ffmpegDir, 'bin')}${path.delimiter}${process.env.PATH ?? ''}`
  }

  console.log(`[sidecar] FFMPEG_DIR=${ffmpegDir}`)
  console.log(`[sidecar] LIBCLANG_PATH=${libclangPath}`)

  const cargo = spawnSync('cargo', ['build', '--release', ...CARGO_PACKAGES], {
    cwd: SIDECAR_ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env
  })
  if (cargo.status !== 0) {
    process.exit(cargo.status ?? 1)
  }
}

async function stageReleaseBinaries(): Promise<void> {
  const key = findPlatformKey()
  const destDir = findStagedDir(key)
  mkdirSync(destDir, { recursive: true })

  const manifest = parseManifest()
  const platformHashes: Record<string, string> = {}
  const releaseDir = findReleaseDir()

  for (const name of CARGO_SIDECARS) {
    const fileName = findSidecarFileName(name)
    const src = path.join(releaseDir, fileName)
    if (!existsSync(src)) {
      console.error(`[sidecar] missing release binary: ${src}`)
      process.exit(1)
    }
    const dest = path.join(destDir, fileName)
    cpSync(src, dest)
    platformHashes[fileName] = hashFile(dest)
    console.log(`[sidecar] staged ${key}/${fileName}`)
  }

  await ensureFfmpegVendor()
  const dlls = findRuntimeDlls(key)
  if (dlls.length === 0) {
    console.error('[sidecar] no FFmpeg runtime DLLs found; run pnpm sidecar:ffmpeg')
    process.exit(1)
  }
  for (const dllSrc of dlls) {
    const fileName = path.basename(dllSrc)
    const dest = path.join(destDir, fileName)
    cpSync(dllSrc, dest)
    platformHashes[fileName] = hashFile(dest)
    console.log(`[sidecar] staged ${key}/${fileName}`)
  }

  manifest.sidecars = [...CARGO_SIDECARS]
  manifest.platforms = manifest.platforms ?? {}
  manifest.platforms[key] = platformHashes
  writeManifest(manifest)
  console.log(`[sidecar] updated manifest for ${key}`)
}

function verifyStagedBinaries(): void {
  const key = findPlatformKey()
  const dir = findStagedDir(key)
  const manifest = parseManifest()
  const expected = manifest.platforms[key]
  if (!expected) {
    console.error(`[sidecar] no manifest entries for ${key}; run pnpm sidecar:build`)
    process.exit(1)
  }

  for (const [fileName, digest] of Object.entries(expected)) {
    const filePath = path.join(dir, fileName)
    if (!existsSync(filePath)) {
      console.error(`[sidecar] missing staged binary: ${filePath}`)
      process.exit(1)
    }
    const actual = hashFile(filePath)
    if (actual !== digest) {
      console.error(`[sidecar] hash mismatch for ${fileName}: expected ${digest}, got ${actual}`)
      process.exit(1)
    }
  }

  console.log(`[sidecar] verified ${key} (${Object.keys(expected).length} files)`)
}

function parseAction(raw: string | undefined): SidecarAction | undefined {
  if (raw === 'build' || raw === 'stage' || raw === 'verify') {
    return raw
  }
  return undefined
}

async function main(): Promise<void> {
  const action = parseAction(process.argv[2] ?? 'build')
  if (!action) {
    console.error('usage: build.ts build|stage|verify')
    process.exit(1)
  }

  if (action === 'build') {
    await buildCargoRelease()
    await stageReleaseBinaries()
    process.exit(0)
  }

  if (action === 'stage') {
    await stageReleaseBinaries()
    process.exit(0)
  }

  verifyStagedBinaries()
  process.exit(0)
}

main().catch(function (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})

export {
  findPlatformKey,
  findReleaseDir,
  findSidecarFileName,
  findStagedDir,
  hashFile,
  parseManifest,
  writeManifest
}
export type { SidecarAction, SidecarManifest }
