/**
 * 开发热重载入口。
 *
 * cas / chunks / logs / data / uploads 已在 `.gitignore`，cargo-watch 默认尊重；
 * 服务进程自身会 dotenv 加载 `.env`，无需再经 Node 注入。
 *
 * 用法: pnpm run dev
 */

import { spawn, type ChildProcess } from 'node:child_process'
import process from 'node:process'

/** clear + 热重载跑 openapi 调试服务 */
const args = ['watch', '-c', '-x', 'run --bin service --features openapi']

/** Windows cmd 引号；避免 shell+args 数组触发 DEP0190 / 参数重复 */
function shellQuote(arg: string): string {
  if (!/[\s"*?<>|&^%]/.test(arg)) return arg
  return `"${arg.replace(/"/g, '\\"')}"`
}

function spawnCargoWatch(): ChildProcess {
  if (process.platform === 'win32') {
    const cmdline = ['cargo', ...args].map(shellQuote).join(' ')
    return spawn(cmdline, {
      stdio: 'inherit',
      shell: true,
      env: process.env,
      windowsHide: true
    })
  }

  return spawn('cargo', args, {
    stdio: 'inherit',
    env: process.env
  })
}

const child = spawnCargoWatch()

child.on('error', (err) => {
  console.error('无法启动 cargo watch（请确认已安装 cargo-watch）:', err.message)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})

for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    if (!child.killed) child.kill(sig)
  })
}
