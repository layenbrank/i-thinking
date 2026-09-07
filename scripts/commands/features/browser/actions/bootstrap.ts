import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { ensureDepotEnv } from '../infra/env.ts'
import { ensureDir, writeWorkspaceReadme } from '../infra/fs.ts'
import { GIT_CANDIDATES } from '../infra/paths.ts'
import { runCommand } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const BootstrapAction: BrowserAction = {
  name: 'bootstrap',
  description: '2. 安装 Chromium 工具链（depot_tools）',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(async function () {
        await runBootstrap(ctx)
      })
  }
}

function isDepotToolsComplete(root: string): boolean {
  return (
    existsSync(path.join(root, 'gclient.bat')) &&
    existsSync(path.join(root, 'detect_host_arch.py')) &&
    existsSync(path.join(root, 'cipd_manifest.txt'))
  )
}

async function downloadToFile(url: string, dest: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`[browser] download failed ${response.status}: ${url}`)
  }
  writeFileSync(dest, Buffer.from(await response.arrayBuffer()))
}

async function runBootstrap(ctx: BrowserContext): Promise<void> {
  ensureDepotEnv(ctx)
  ensureDir(ctx.workspaceRoot)
  writeWorkspaceReadme(ctx)

  const archiveUrl = ctx.config.urls.depotToolsArchive
  const archivePath = path.join(
    process.env.TEMP || process.env.TMP || '.',
    'depot_tools_full.tar.gz'
  )
  const parentDir = path.dirname(ctx.depotTools)

  if (isDepotToolsComplete(ctx.depotTools)) {
    logger.info(`[browser] depot_tools already present at ${ctx.depotTools}`)
  } else {
    logger.info(`[browser] Downloading depot_tools from ${archiveUrl} ...`)
    ensureDir(parentDir)
    await downloadToFile(archiveUrl, archivePath)

    const staging = path.join(parentDir, 'depot_tools_staging')
    if (existsSync(staging)) {
      rmSync(staging, { recursive: true, force: true })
    }
    mkdirSync(staging, { recursive: true })
    runCommand('tar', ['-xzf', archivePath, '-C', staging])
    if (existsSync(ctx.depotTools)) {
      rmSync(ctx.depotTools, { recursive: true, force: true })
    }
    renameSync(staging, ctx.depotTools)
    try {
      unlinkSync(archivePath)
    } catch {
      // ignore
    }
    logger.success(`[browser] depot_tools installed at ${ctx.depotTools}`)
  }

  if (!existsSync(path.join(ctx.depotTools, '.git'))) {
    runCommand('git', ['init'], { cwd: ctx.depotTools })
    runCommand('git', ['add', '-A'], { cwd: ctx.depotTools })
    try {
      runCommand(
        'git',
        [
          '-c',
          'user.email=dev@local',
          '-c',
          'user.name=dev',
          'commit',
          '-m',
          'bootstrap',
          '--quiet'
        ],
        { cwd: ctx.depotTools }
      )
    } catch {
      logger.warn('[browser] git commit bootstrap skipped')
    }
  }

  ensureDepotEnv(ctx)

  const cipdExe = path.join(ctx.depotTools, 'cipd.exe')
  if (!existsSync(cipdExe)) {
    const version = readFileSync(
      path.join(ctx.depotTools, 'cipd_client_version'),
      'utf8'
    ).trim()
    const base = ctx.config.urls.cipdClient
    const cipdUrl = base.includes('?')
      ? `${base}&version=${version}`
      : `${base}?platform=windows-amd64&version=${version}`
    logger.info(`[browser] Downloading CIPD from ${cipdUrl} ...`)
    await downloadToFile(cipdUrl, cipdExe)
  }

  try {
    runCommand(
      'cmd',
      ['/c', `set DEPOT_TOOLS_UPDATE=0&& "${path.join(ctx.depotTools, 'cipd_bin_setup.bat')}"`],
      { cwd: ctx.depotTools }
    )
  } catch {
    logger.warn('[browser] cipd_bin_setup warning')
  }

  const pythonReldir = path.join(ctx.depotTools, 'python3_bin_reldir.txt')
  const winTools = path.join(ctx.depotTools, 'bootstrap', 'win_tools.bat')
  if (!existsSync(pythonReldir)) {
    if (!existsSync(winTools)) {
      throw new Error(`[browser] Missing ${winTools}`)
    }
    logger.info('[browser] Initializing depot_tools Windows Python ...')
    runCommand('cmd', ['/c', `set DEPOT_TOOLS_UPDATE=0&& "${winTools}"`], {
      cwd: ctx.depotTools
    })
    if (!existsSync(pythonReldir)) {
      throw new Error(`[browser] Expected ${pythonReldir} after win_tools.bat`)
    }
  }

  runCommand('cmd', ['/c', 'set DEPOT_TOOLS_UPDATE=0&& gclient --version'], {
    cwd: ctx.depotTools
  })

  for (const gitDir of GIT_CANDIDATES) {
    if (!existsSync(path.join(gitDir, 'git.exe'))) {
      continue
    }
    const gitBat = path.join(gitDir, 'git.bat')
    if (!existsSync(gitBat)) {
      writeFileSync(gitBat, '@echo off\r\n"%~dp0git.exe" %*\r\n', 'utf8')
      logger.info(`[browser] Created git.bat shim at ${gitBat}`)
    }
    break
  }

  ensureDir(ctx.gitCache)
  logger.success('[browser] bootstrap done.')
}

export { BootstrapAction }
