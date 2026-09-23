import { execFileSync } from 'node:child_process'
import { existsSync, rmSync } from 'node:fs'
import path from 'node:path'

import { FORGE_DIR, MONOREPO_ROOT } from '../constants'

const OUT_DIR = path.resolve(MONOREPO_ROOT, 'out', 'studio')

/** 结束占用产物的进程：Windows 下 electron 会锁住 asar / out 目录 */
const STOP_LOCKERS_SCRIPT = path.join(FORGE_DIR, 'hooks', 'stop-locked-processes.ps1')

function removePath(target: string): void {
  if (!existsSync(target)) return
  try {
    rmSync(target, { recursive: true, force: true })
  } catch (error) {
    // best-effort：EBUSY/EPERM 不阻塞构建，但必须出声（否则不知道产物没清掉）
    console.warn('[forge] 清理路径失败，继续打包', target, error)
  }
}

/**
 * Windows 上若仍有本仓库的 electron / 已打包 Studio 在跑，会锁 asar 与 out 目录。
 * 判定逻辑在 stop-locked-processes.ps1，按可执行文件路径过滤，避免误杀其它 Electron 应用。
 */
function stopLockedProcesses(): void {
  if (process.platform !== 'win32') return

  try {
    execFileSync(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        STOP_LOCKERS_SCRIPT,
        '-Root',
        MONOREPO_ROOT
      ],
      // stderr 直接透传：脚本自身已静音可忽略错误，这里出现的都是真要看的
      { stdio: ['ignore', 'ignore', 'inherit'], windowsHide: true }
    )
  } catch (error) {
    // PowerShell 不可用等环境问题：不阻断打包，但要能看见
    console.warn('[forge] 结束占用进程失败', error instanceof Error ? error.message : error)
  }
}

/**
 * Forge prePackage：
 * 1. 结束可能锁定产物的进程
 * 2. 清理上次构建产物
 */
async function cleanupBeforePackage(): Promise<void> {
  stopLockedProcesses()
  removePath(OUT_DIR)
}

export { cleanupBeforePackage, stopLockedProcesses }
