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
import {
  APPLE_ID,
  APPLE_ID_PASSWORD,
  APPLE_TEAM_ID,
  OSX_NOTARIZE,
  OSX_SIGN,
  WINDOWS_CERTIFICATE_FILE,
  WINDOWS_CERTIFICATE_PASSWORD,
  WINDOWS_CERTIFICATE_SUBJECT
} from './env'
import { copyAndVerifySidecars } from './hooks/sidecar'
import { copyBetterSqlite3 } from './hooks/natives'
import { PACKAGER_TMP } from './hooks/cleanup'

/** 国内默认镜像；Turbo strict 下需 turbo.json globalPassThroughEnv 透传 ELECTRON_MIRROR */
const ELECTRON_DOWNLOAD_MIRROR =
  process.env.ELECTRON_MIRROR || 'https://npmmirror.com/mirrors/electron/'

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

function buildWindowsSign():
  | NonNullable<ForgeConfig['packagerConfig']>['windowsSign']
  | undefined {
  if (WINDOWS_CERTIFICATE_FILE) {
    return {
      certificateFile: WINDOWS_CERTIFICATE_FILE,
      certificatePassword: WINDOWS_CERTIFICATE_PASSWORD
    }
  }
  // 证书存储：通过 signtool /n 按主题名选择
  if (WINDOWS_CERTIFICATE_SUBJECT) {
    return {
      signWithParams: `/n "${WINDOWS_CERTIFICATE_SUBJECT}"`
    }
  }
  return undefined
}

function buildOsxNotarize():
  | NonNullable<ForgeConfig['packagerConfig']>['osxNotarize']
  | undefined {
  if (!OSX_NOTARIZE) return undefined
  return {
    appleId: APPLE_ID!,
    appleIdPassword: APPLE_ID_PASSWORD!,
    teamId: APPLE_TEAM_ID!
  }
}

function buildPackagerConfig(): NonNullable<ForgeConfig['packagerConfig']> {
  const icon = findIconPath()
  const windowsSign = buildWindowsSign()
  const osxNotarize = buildOsxNotarize()

  return {
    asar: true,
    prune: false,
    overwrite: true,
    // 必须在 apps/studio 外（见 forge/hooks/cleanup.ts），否则会 copy 进自身子目录
    tmpdir: PACKAGER_TMP,
    appVersion: APP_VERSION,
    name: APP_NAME,
    executableName: APP_EXECUTABLE,
    appBundleId: APP_ID,
    appCategoryType: 'public.app-category.developer-tools',
    appCopyright: `Copyright © ${new Date().getFullYear()} i-thinking`,
    ignore: isIgnoredPath,
    download: {
      mirrorOptions: {
        mirror: ELECTRON_DOWNLOAD_MIRROR
      }
    },
    ...(icon ? { icon } : {}),
    ...(windowsSign ? { windowsSign } : {}),
    ...(OSX_SIGN ? { osxSign: {} } : {}),
    ...(osxNotarize ? { osxNotarize } : {}),
    afterCopy: [runAfterCopy]
  }
}

export { buildPackagerConfig }
