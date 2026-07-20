import { existsSync } from 'node:fs'
import path from 'node:path'
import type { ForgeConfig } from '@electron-forge/shared-types'

import {
  APP_EXECUTABLE,
  APP_ID,
  APP_NAME,
  APP_VERSION,
  PACKAGE_ROOT
} from './constants'
import { copyAndVerifySidecars } from './hooks/sidecar'
import { copyBetterSqlite3 } from './hooks/natives'

/**
 * Vite 已打包业务与 workspace 依赖；asar 只保留：
 * - `.vite/` 构建产物
 * - `package.json`
 * - `generated/`（Prisma Client）
 * native / Rust 侧车由 afterCopy 写入
 *
 * prune:false：跳过 flora-colossus（pnpm hoisted + 嵌套 apps/* 会误报缺依赖）
 */
function isIgnoredPath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/')
  if (normalized === '' || normalized === '/') return false

  const keep = [/^\/\.vite(\/|$)/, /^\/package\.json$/, /^\/generated(\/|$)/]
  if (keep.some(function (pattern) {
    return pattern.test(normalized)
  })) {
    return false
  }

  return true
}

function findIconPath(): string | undefined {
  const candidates = [
    path.join(PACKAGE_ROOT, 'resources', 'icon'),
    path.join(PACKAGE_ROOT, 'resources', 'icon.ico'),
    path.join(PACKAGE_ROOT, 'resources', 'icon.icns'),
    path.join(PACKAGE_ROOT, 'resources', 'icon.png')
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return undefined
}

function runAfterCopy(
  buildPath: string,
  electronVersion: string,
  platform: string,
  arch: string,
  done: (err?: Error) => void
): void {
  copyBetterSqlite3(buildPath, electronVersion, platform, arch, function (err) {
    if (err) {
      done(err)
      return
    }
    copyAndVerifySidecars(buildPath, electronVersion, platform, arch, done)
  })
}

function buildPackagerConfig(): NonNullable<ForgeConfig['packagerConfig']> {
  const icon = findIconPath()

  return {
    asar: true,
    prune: false,
    appVersion: APP_VERSION,
    name: APP_NAME,
    executableName: APP_EXECUTABLE,
    appBundleId: APP_ID,
    appCopyright: `Copyright © ${new Date().getFullYear()} i-thinking`,
    ignore: isIgnoredPath,
    ...(icon ? { icon } : {}),
    afterCopy: [runAfterCopy]
  }
}

export { buildPackagerConfig }
