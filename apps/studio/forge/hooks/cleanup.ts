import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

import { PACKAGE_ROOT } from '../constants'

const OUT_DIR = path.resolve(PACKAGE_ROOT, '..', '..', 'out', 'studio')

function removePath(target: string): void {
  if (!existsSync(target)) return
  try {
    rmSync(target, { recursive: true, force: true })
  } catch {
    // best-effort：EBUSY/EPERM 不阻塞构建
  }
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
    "    $_.ProcessName -match '^(electron|i-thinking|studio)$' -and",
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
 * Forge prePackage：
 * 1. 结束可能锁定产物的进程
 * 2. 清理上次构建产物
 */
async function cleanupBeforePackage(): Promise<void> {
  stopLockedStudioProcesses()
  removePath(OUT_DIR)
}

export { cleanupBeforePackage, stopLockedStudioProcesses }
