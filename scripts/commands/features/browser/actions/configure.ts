import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { ensureDepotEnv } from '../infra/env.ts'
import { assertPath, ensureDir, writeUtf8NoBom } from '../infra/fs.ts'
import { GN_DIR } from '../infra/paths.ts'
import { runCommand } from '../infra/run.ts'
import { findGnProfile } from '../profiles/catalog.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const ConfigureAction: BrowserAction = {
  name: 'configure',
  description: '7. 配置构建参数并生成 out 目录（默认开发；--release 发布）',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .option('--release', '使用 release GN profile')
      .action(function (opts: { release?: boolean }) {
        runConfigure(ctx, opts.release ? 'release' : 'dev')
      })
  }
}

function runConfigure(ctx: BrowserContext, profileId: string): void {
  ensureDepotEnv(ctx)
  assertPath(ctx.chromiumRoot, 'CHROMIUM_ROOT')

  const profile = findGnProfile(profileId)
  const argsSource = path.join(GN_DIR, profile.argsFile)
  assertPath(argsSource, `GN args ${profile.argsFile}`)

  const pythonReldir = path.join(ctx.depotTools, 'python3_bin_reldir.txt')
  if (!existsSync(pythonReldir)) {
    throw new Error(
      `[browser] depot_tools Python 未初始化（缺 ${pythonReldir}）。先运行: pnpm command browser bootstrap`
    )
  }

  ensureDir(ctx.outDir)
  let combined = readFileSync(argsSource, 'utf8')

  if (profile.localArgsFile) {
    const localPath = path.join(GN_DIR, profile.localArgsFile)
    if (existsSync(localPath)) {
      logger.info(`[browser] Merging local secrets: ${localPath}`)
      combined =
        combined.trimEnd() +
        '\r\n\r\n' +
        readFileSync(localPath, 'utf8').trimEnd() +
        '\r\n'
    } else {
      logger.warn(`[browser] WARN: ${localPath} not found — release 可能缺 google_* keys`)
      logger.warn(
        '      Copy gn/args.release.local.gn.example -> gn/args.release.local.gn and fill values.'
      )
    }
  }

  const argsDest = path.join(ctx.outDir, 'args.gn')
  writeUtf8NoBom(argsDest, combined)
  logger.info(`[browser] Writing ${argsDest} (${profile.description})`)

  runCommand('gn', ['gen', ctx.outRel], { cwd: ctx.chromiumRoot })
  logger.success(`[browser] configure done. Out dir: ${ctx.outDir}`)
}

export { ConfigureAction }
