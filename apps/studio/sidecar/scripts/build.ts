import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const SIDECAR_ROOT = path.resolve(import.meta.dirname, '..')
const MANIFEST_PATH = path.join(SIDECAR_ROOT, 'manifest.json')
const SIDECARS = ['corex', 'generate', 'service'] as const
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

function findSidecarFileName(
  name: (typeof SIDECARS)[number],
  platform = process.platform
): string {
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
    return { sidecars: [...SIDECARS], platforms: {} }
  }
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as SidecarManifest
}

function writeManifest(manifest: SidecarManifest): void {
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function buildCargoRelease(): void {
  const cargo = spawnSync(
    'cargo',
    ['build', '--release', ...CARGO_PACKAGES],
    {
      cwd: SIDECAR_ROOT,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    }
  )
  if (cargo.status !== 0) {
    process.exit(cargo.status ?? 1)
  }
}

function stageReleaseBinaries(): void {
  const key = findPlatformKey()
  const destDir = findStagedDir(key)
  mkdirSync(destDir, { recursive: true })

  const manifest = parseManifest()
  const platformHashes: Record<string, string> = {}
  const releaseDir = findReleaseDir()

  for (const name of SIDECARS) {
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

  manifest.sidecars = [...SIDECARS]
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

function main(): void {
  const action = parseAction(process.argv[2] ?? 'build')
  if (!action) {
    console.error('usage: build.ts build|stage|verify')
    process.exit(1)
  }

  if (action === 'build') {
    buildCargoRelease()
    stageReleaseBinaries()
    process.exit(0)
  }

  if (action === 'stage') {
    stageReleaseBinaries()
    process.exit(0)
  }

  verifyStagedBinaries()
  process.exit(0)
}

main()

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
