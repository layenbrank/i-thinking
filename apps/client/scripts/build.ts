/**
 * client build 入口：注入空的 TAURI_SIGNING_PRIVATE_KEY_PASSWORD 后执行 tauri build。
 * Windows 系统环境变量无法保存空值；私钥仍从已有环境变量读取。
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const CLIENT_DIR = path.resolve(SCRIPT_DIR, '..')
const LOG_PREFIX = '[build]'

function build(): void {
  process.env.TAURI_SIGNING_PRIVATE_KEY_PASSWORD = ''
  console.log(`${LOG_PREFIX} TAURI_SIGNING_PRIVATE_KEY_PASSWORD=""`)

  const result = spawnSync('tauri', ['build'], {
    cwd: CLIENT_DIR,
    env: process.env,
    stdio: 'inherit',
    shell: true
  })

  if (result.error) {
    console.error(`${LOG_PREFIX}`, result.error)
    process.exit(1)
  }

  process.exit(result.status ?? 1)
}

build()

export { build }
