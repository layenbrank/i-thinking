import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { PACKAGE_ROOT } from '../constants'
import { SIDECAR_VARIANT } from '../env'

const CHECKSUMS_FILE = 'checksums.json'

/**
 * Studio 安装包里永远不带的文件（即便误进了 staging）。
 * goose 是 client ACP 侧车；agent 走 opencode。
 */
const NEVER_BUNDLE = new Set(['goose.exe', 'goose'])

/**
 * 旧版 staging 的 checksums.json 可能没写 `onDemand`：精简版会误把整包打进去（500MB+）。
 * 按文件名兜底，与 tools.lock 里标 onDemand 的工具对齐。
 */
const ON_DEMAND_NAME_HINT =
  /^(pandoc|ffmpeg|ffprobe|ffplay|opencode)(\.exe)?$/i

interface StagingChecksums {
  platform: string
  /** 按需工具文件（由 `pnpm command sidecar stage` 按 tools.lock 写出）：精简版不带它们 */
  onDemand?: string[]
  files: Record<string, string>
}

function findOnDemandFiles(expected: StagingChecksums): Set<string> {
  const listed = expected.onDemand ?? []
  if (listed.length > 0) {
    return new Set(listed)
  }
  const inferred = Object.keys(expected.files).filter(function (name) {
    return ON_DEMAND_NAME_HINT.test(name)
  })
  if (inferred.length > 0) {
    console.warn(
      '[forge] checksums.json 缺少 onDemand，已按文件名兜底排除（请重跑 ' +
        '`pnpm command sidecar stage studio` 写出正式字段）：' +
        inferred.join(', ')
    )
  }
  return new Set(inferred)
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

function parseStagingChecksums(key: string): StagingChecksums {
  const filePath = path.join(findStagedSidecarDir(key), CHECKSUMS_FILE)
  if (!existsSync(filePath)) {
    throw new Error(`[sidecar] missing ${filePath}. Run: pnpm command sidecar bootstrap studio`)
  }
  return JSON.parse(readFileSync(filePath, 'utf8')) as StagingChecksums
}

/**
 * 将当前平台 staged 侧车复制到 resources/sidecar，并按本地 checksums.json 校验 SHA-256。
 *
 * 档位决定按需工具的去留（见 forge/env.ts 的 SIDECAR_VARIANT）：
 * - lite：pandoc / ffmpeg / opencode 不复制 —— 它们由 Studio 运行时从在线源下载，
 *   安装包里带上去只是无谓地大 800 多 MB；
 * - full：要求它们都在，缺了直接报错（staging 不全，重跑一次 bootstrap）。
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
          `[sidecar] no staged binaries at ${srcDir}. Run: pnpm command sidecar bootstrap studio`
        )
      )
      return
    }

    const expected = parseStagingChecksums(key)
    const onDemand = findOnDemandFiles(expected)
    const destDir = path.join(buildPath, '..', 'sidecar')
    mkdirSync(destDir, { recursive: true })

    const files = Object.entries(expected.files)
    if (SIDECAR_VARIANT === 'full') {
      const missing = [...onDemand].filter(function (fileName) {
        return !expected.files[fileName]
      })
      if (missing.length > 0) {
        done(
          new Error(
            `[sidecar] 完整版缺少按需工具：${missing.join(', ')}。` +
                ' staging 不全：先跑 pnpm command sidecar bootstrap studio'
          )
        )
        return
      }
    }

    const skipped: string[] = []
    for (const [fileName, digest] of files) {
      if (NEVER_BUNDLE.has(fileName) || (SIDECAR_VARIANT === 'lite' && onDemand.has(fileName))) {
        skipped.push(fileName)
        continue
      }
      const src = path.join(srcDir, fileName)
      if (!existsSync(src)) {
        done(new Error(`[sidecar] missing staged file: ${src}`))
        return
      }
      const actual = hashFile(src)
      if (actual !== digest) {
        done(
          new Error(`[sidecar] hash mismatch for ${fileName}: expected ${digest}, got ${actual}`)
        )
        return
      }
      cpSync(src, path.join(destDir, fileName))
    }

    console.log(
      `[forge] 侧车档位 ${SIDECAR_VARIANT}：已复制 ${files.length - skipped.length} 个文件` +
        (skipped.length > 0 ? `，未随包：${skipped.join(', ')}` : '')
    )
    done()
  } catch (error) {
    // 交给 Forge 的 done 之前先出声：构建日志里要留痕
    console.warn('[forge] sidecar 复制/校验失败', error)
    done(error instanceof Error ? error : new Error(String(error)))
  }
}

export { copyAndVerifySidecars, findPlatformKey, findStagedSidecarDir, parseStagingChecksums }
export type { StagingChecksums }
