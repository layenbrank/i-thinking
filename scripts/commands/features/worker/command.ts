import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

import { Command } from 'commander'

import { logger } from '../../core/logger.ts'
import { SCRIPTS_INFRA } from '../../core/paths.ts'
import type { CommandModule } from '../../core/registry.ts'

const WORKER_ROOT = path.join(SCRIPTS_INFRA, 'worker')

function assertWorkerRoot(): void {
  if (!existsSync(path.join(WORKER_ROOT, 'wrangler.jsonc'))) {
    throw new Error(`[worker] 缺少 ${WORKER_ROOT}/wrangler.jsonc`)
  }
}

function runWrangler(args: string[]): void {
  assertWorkerRoot()
  logger.info(`[worker] 执行 wrangler ${args.join(' ')}`)
  const result = spawnSync('pnpm', ['exec', 'wrangler', ...args], {
    cwd: WORKER_ROOT,
    stdio: 'inherit',
    shell: true,
    encoding: 'utf8'
  })
  if (result.status !== 0) {
    throw new Error(`[worker] wrangler 退出码 ${result.status}`)
  }
}

function runUploadScript(scriptName: string, extraArgs: string[]): void {
  assertWorkerRoot()
  const scriptPath = path.join(WORKER_ROOT, 'scripts', scriptName)
  if (!existsSync(scriptPath)) {
    throw new Error(`[worker] 缺少脚本 ${scriptPath}`)
  }
  if (process.platform !== 'win32') {
    throw new Error('[worker] 上传脚本仅支持 Windows PowerShell')
  }
  const result = spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...extraArgs],
    { cwd: WORKER_ROOT, stdio: 'inherit' }
  )
  if (result.status !== 0) {
    throw new Error(`[worker] ${scriptName} 退出码 ${result.status}`)
  }
}

function registerWorker(program: Command): void {
  const worker = program
    .command('worker')
    .description('Cloudflare Worker（R2 安装包下载，位于 scripts/infra/worker）')

  worker
    .command('deploy')
    .description('部署 Worker（wrangler deploy）')
    .action(function () {
      runWrangler(['deploy'])
    })

  worker
    .command('dev')
    .description('本地调试（wrangler dev）')
    .action(function () {
      runWrangler(['dev'])
    })

  worker
    .command('secret')
    .description('写入密钥 AUTH_KEY_SECRET')
    .action(function () {
      runWrangler(['secret', 'put', 'AUTH_KEY_SECRET'])
    })

  worker
    .command('upload')
    .description('运行 multipart-upload.ps1（仅 Windows）')
    .allowUnknownOption(true)
    .action(function (_opts, cmd) {
      const forwarded = (cmd.args as string[]) ?? []
      runUploadScript('multipart-upload.ps1', forwarded)
    })
}

const WorkerCommand: CommandModule = {
  name: 'worker',
  description: 'Cloudflare R2 下载 Worker',
  register(program) {
    registerWorker(program)
  }
}

export { WorkerCommand, WORKER_ROOT }
