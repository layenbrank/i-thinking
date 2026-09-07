/**
 * browser 发布构建入口：WebUI → sync → apply → release configure → chromium build → stage。
 * 对齐 apps/client：`pnpm build` 产出可分发运行时，而非仅 Vite。
 * 永不使用 shell:true + args（避免 Node DEP0190）。
 */

import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const BROWSER_DIR = path.resolve(SCRIPT_DIR, '..')
const REPO_ROOT = path.resolve(BROWSER_DIR, '../..')
const CLI_ENTRY = path.join(REPO_ROOT, 'scripts', 'commands', 'index.ts')
const LOG_PREFIX = '[browser:build]'

function quoteWinArg(arg: string): string {
  if (arg.length === 0) {
    return '""'
  }
  if (!/[\s"]/u.test(arg)) {
    return arg
  }
  return `"${arg.replace(/"/g, '\\"')}"`
}

function run(command: string, args: string[], cwd: string): void {
  console.log(`${LOG_PREFIX} ${command} ${args.join(' ')}`)

  let file = command
  let argv = args
  let windowsVerbatimArguments = false

  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || 'cmd.exe'
    const line = [command, ...args].map(quoteWinArg).join(' ')
    file = comspec
    argv = ['/d', '/s', '/c', line]
    windowsVerbatimArguments = true
  }

  const result = spawnSync(file, argv, {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: false,
    windowsVerbatimArguments
  })
  if (result.error) {
    console.error(LOG_PREFIX, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runNode(script: string, args: string[], cwd: string): void {
  console.log(`${LOG_PREFIX} node ${script} ${args.join(' ')}`)
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd,
    env: process.env,
    stdio: 'inherit',
    shell: false
  })
  if (result.error) {
    console.error(LOG_PREFIX, result.error)
    process.exit(1)
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runViteBuild(): void {
  run('pnpm', ['exec', 'vite', 'build'], BROWSER_DIR)
}

function runBrowser(args: string[]): void {
  runNode(CLI_ENTRY, ['browser', ...args], REPO_ROOT)
}

function build(): void {
  runViteBuild()
  runBrowser(['sync'])
  runBrowser(['apply'])
  runBrowser(['configure', '--release'])
  runBrowser(['build'])
  runBrowser(['stage'])
  console.log(`${LOG_PREFIX} done → apps/browser/build/runtime`)
}

build()

export { build }
