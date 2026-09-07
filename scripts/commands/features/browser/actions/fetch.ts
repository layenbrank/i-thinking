import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { ensureDepotEnv } from '../infra/env.ts'
import { ensureDir } from '../infra/fs.ts'
import { runCommand } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const FetchAction: BrowserAction = {
  name: 'fetch',
  description: '4. 拉取或同步 Chromium 源码',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runFetch(ctx)
      })
  }
}

function runFetch(ctx: BrowserContext): void {
  ensureDepotEnv(ctx)
  ensureDir(ctx.workspaceRoot)
  ensureDir(ctx.gitCache)
  ensureDir(ctx.chromiumCheckout)

  const srcDir = path.join(ctx.chromiumCheckout, 'src')
  const gclient = path.join(ctx.chromiumCheckout, '.gclient')
  const hasSrc = existsSync(path.join(srcDir, 'BUILD.gn'))
  const hasGclient = existsSync(gclient)

  if (!hasSrc && !hasGclient) {
    logger.info('[browser] Fetching Chromium (tens of GB; may take hours) ...')
    runCommand('fetch', ['--nohooks', '--no-history', 'chromium'], {
      cwd: ctx.chromiumCheckout
    })
  } else {
    logger.info('[browser] Existing checkout; gclient sync --nohooks --no-history ...')
    runCommand('gclient', ['sync', '--nohooks', '--no-history'], {
      cwd: ctx.chromiumCheckout
    })
  }

  if (!existsSync(srcDir)) {
    throw new Error(`[browser] Expected Chromium src at ${srcDir}`)
  }

  logger.info('[browser] Running gclient runhooks in src ...')
  try {
    runCommand('gclient', ['runhooks'], { cwd: srcDir })
  } catch (error) {
    logger.warn(
      `[browser] gclient runhooks warning: ${error instanceof Error ? error.message : String(error)}`
    )
  }

  logger.success('[browser] fetch done.')
}

export { FetchAction }
