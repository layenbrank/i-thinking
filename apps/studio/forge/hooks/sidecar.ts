import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PACKAGE_ROOT } from '../constants'

type SidecarManifest = {
  sidecars: string[]
  platforms: Record<string, Record<string, string>>
}

function findPlatformKey(platform: string = process.platform, arch: string = process.arch): string {
  return `${platform}-${arch}`
}

function hashFile(filePath: string): string {
  const hash = createHash('sha256')
  hash.update(readFileSync(filePath))
  return hash.digest('hex')
}

function findStagedSidecarDir(key = findPlatformKey()): string {
  return path.join(PACKAGE_ROOT, 'sidecar', 'staging', key)
}

function parseSidecarManifest(): SidecarManifest {
  const manifestPath = path.join(PACKAGE_ROOT, 'sidecar', 'manifest.json')
  if (!existsSync(manifestPath)) {
    throw new Error(`[sidecar] missing manifest: ${manifestPath}`)
  }
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as SidecarManifest
}

/**
 * 将当前平台 staged 侧车复制到 resources/sidecar，并按 manifest 校验 SHA-256。
 */
function copyAndVerifySidecars(
  buildPath: string,
  _electronVersion: string,
  platform: string,
  arch: string,
  done: (err?: Error) => void
): void {
  try {
    const key = findPlatformKey(platform, arch)
    const srcDir = findStagedSidecarDir(key)
    if (!existsSync(srcDir) || readdirSync(srcDir).length === 0) {
      done(
        new Error(
          `[sidecar] no staged binaries at ${srcDir}. Run: pnpm --filter @i-thinking/studio sidecar:build`
        )
      )
      return
    }

    const manifest = parseSidecarManifest()
    const expected = manifest.platforms[key]
    if (!expected) {
      done(new Error(`[sidecar] manifest missing platform ${key}. Run sidecar:build first.`))
      return
    }

    const destDir = path.join(buildPath, '..', 'sidecar')
    mkdirSync(destDir, { recursive: true })

    for (const [fileName, digest] of Object.entries(expected)) {
      const src = path.join(srcDir, fileName)
      if (!existsSync(src)) {
        done(new Error(`[sidecar] missing staged file: ${src}`))
        return
      }
      const actual = hashFile(src)
      if (actual !== digest) {
        done(new Error(`[sidecar] hash mismatch for ${fileName}: expected ${digest}, got ${actual}`))
        return
      }
      cpSync(src, path.join(destDir, fileName))
    }

    done()
  } catch (error) {
    done(error instanceof Error ? error : new Error(String(error)))
  }
}

export {
  copyAndVerifySidecars,
  findPlatformKey,
  findStagedSidecarDir,
  parseSidecarManifest
}
export type { SidecarManifest }
