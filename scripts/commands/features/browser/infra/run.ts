import { spawnSync } from 'node:child_process'

import { logger } from '../../../core/logger.ts'

interface RunOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  input?: string
}

/** Windows 参数引号（供 cmd /c 整行）。 */
function quoteWinArg(arg: string): string {
  if (arg.length === 0) {
    return '""'
  }
  if (!/[\s"]/u.test(arg)) {
    return arg
  }
  return `"${arg.replace(/"/g, '\\"')}"`
}

/**
 * 统一 spawn：永不使用 shell:true + args（避免 Node DEP0190）。
 * Win32 上经 ComSpec /d /s /c 跑 .bat/.cmd（gn、autoninja、gclient 等）。
 */
function parseSpawn(
  command: string,
  args: string[]
): { file: string; argv: string[]; windowsVerbatimArguments: boolean } {
  if (process.platform !== 'win32') {
    return { file: command, argv: args, windowsVerbatimArguments: false }
  }

  const comspec = process.env.ComSpec || 'cmd.exe'
  if (command === 'cmd' || command === 'cmd.exe') {
    return { file: comspec, argv: args, windowsVerbatimArguments: true }
  }

  const line = [command, ...args].map(quoteWinArg).join(' ')
  return {
    file: comspec,
    argv: ['/d', '/s', '/c', line],
    windowsVerbatimArguments: true
  }
}

function runCommand(
  command: string,
  args: string[],
  options: RunOptions = {}
): void {
  logger.info(`[browser] ${command} ${args.join(' ')}`)
  const spawn = parseSpawn(command, args)
  const result = spawnSync(spawn.file, spawn.argv, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    stdio: 'inherit',
    shell: false,
    encoding: 'utf8',
    input: options.input,
    windowsVerbatimArguments: spawn.windowsVerbatimArguments
  })
  if (result.error) {
    throw new Error(`[browser] ${command} 启动失败: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`[browser] ${command} 退出码 ${result.status ?? 'null'}`)
  }
}

function runCapture(
  command: string,
  args: string[],
  options: RunOptions = {}
): string {
  const spawn = parseSpawn(command, args)
  const result = spawnSync(spawn.file, spawn.argv, {
    cwd: options.cwd,
    env: options.env ?? process.env,
    encoding: 'utf8',
    shell: false,
    windowsVerbatimArguments: spawn.windowsVerbatimArguments
  })
  if (result.error) {
    throw new Error(`[browser] ${command} 启动失败: ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(
      `[browser] ${command} 退出码 ${result.status ?? 'null'}: ${result.stderr || result.stdout}`
    )
  }
  return result.stdout ?? ''
}

function runRobocopy(args: string[]): void {
  logger.info(`[browser] robocopy ${args.join(' ')}`)
  const result = spawnSync('robocopy', args, {
    stdio: 'inherit',
    encoding: 'utf8',
    shell: false
  })
  const code = result.status ?? 0
  // robocopy: 0-7 success
  if (code >= 8) {
    throw new Error(`[browser] robocopy 退出码 ${code}`)
  }
}

function runGit(
  args: string[],
  cwd: string
): { code: number; output: string } {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    shell: false
  })
  const stdout = result.stdout ?? ''
  const stderr = result.stderr ?? ''
  return {
    code: result.status ?? 1,
    output: `${stdout}${stderr}`.trim()
  }
}

export { runCapture, runCommand, runGit, runRobocopy }
