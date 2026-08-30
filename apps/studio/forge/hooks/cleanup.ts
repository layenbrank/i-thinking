import { existsSync, mkdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { PACKAGE_ROOT } from '../constants'

/**
 * 临时目录必须在 apps/studio **之外**，否则 packager 会把包根拷进自身子目录报错。
 * 统一缓存：monorepo 根 `.cache/packager/studio`。
 */
const REPO_ROOT = path.resolve(PACKAGE_ROOT, '..', '..')
const PACKAGER_TMP = path.join(REPO_ROOT, '.cache', 'packager', 'studio')
const OUT_DIR = path.join(PACKAGE_ROOT, 'out')

function removePath(target: string): void {
  if (!existsSync(target)) return
  rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: 8,
    retryDelay: 250
  })
}

/**
 * Windows 上若仍有本仓库的 electron / 已打包 Studio 在跑，会锁 asar。
 * 仅结束路径落在 monorepo 下的进程，避免误杀其它 Electron 应用。
 */
function stopLockedStudioProcesses(): void {
  if (process.platform !== 'win32') return

  const root = PACKAGE_ROOT.replace(/\\/g, '/').toLowerCase()
  const script = [
    `$root = '${root}'`,
    'Get-Process -ErrorAction SilentlyContinue |',
    '  Where-Object {',
    "    $_.ProcessName -match '^(electron|i-thinking)$' -and",
    '    $_.Path -and',
    "    ($_.Path -replace '\\\\','/').ToLower().StartsWith($root)",
    '  } |',
    '  Stop-Process -Force -ErrorAction SilentlyContinue'
  ].join(' ')

  try {
    execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { stdio: 'ignore', windowsHide: true }
    )
  } catch {
    // 忽略：无权限或无匹配进程
  }
}

/**
 * Forge prePackage：清理上次打包残留，降低 Win32 EBUSY。
 */
async function cleanupBeforePackage(): Promise<void> {
  stopLockedStudioProcesses()
  removePath(PACKAGER_TMP)
  mkdirSync(PACKAGER_TMP, { recursive: true })

  // 系统 Temp 里上次失败留下的 electron-packager 模板
  removePath(path.join(os.tmpdir(), 'electron-packager'))
  // 旧版路径残留
  removePath(path.join(PACKAGE_ROOT, '.packager-tmp'))
  removePath(path.join(REPO_ROOT, '.packager-tmp'))

  // out/ 内正在运行的包也会锁 asar；overwrite 前先清更稳
  removePath(OUT_DIR)
}

export { PACKAGER_TMP, cleanupBeforePackage, stopLockedStudioProcesses }
