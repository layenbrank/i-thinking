import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { assertPath } from '../infra/fs.ts'
import { runGit, runRobocopy } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'
import { runWireSteps } from '../wire/catalog.ts'

const ApplyAction: BrowserAction = {
  name: 'apply',
  description: '6. 应用 overlay、补丁与产品接线',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runApply(ctx)
      })
  }
}

function runApply(ctx: BrowserContext): void {
  assertPath(ctx.chromiumRoot, 'CHROMIUM_ROOT')
  assertPath(ctx.overlayRoot, 'overlay')

  logger.info(`[browser] Copying overlay -> ${ctx.chromiumRoot}`)
  runRobocopy([
    ctx.overlayRoot,
    ctx.chromiumRoot,
    '/E',
    '/IS',
    '/IT',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NC',
    '/NS'
  ])
  logger.success('[browser] Overlay copy complete.')

  if (existsSync(ctx.patchesDir)) {
    const patches = readdirSync(ctx.patchesDir)
      .filter(function (name) {
        return name.endsWith('.patch')
      })
      .sort()
    for (const name of patches) {
      const full = path.join(ctx.patchesDir, name)
      logger.info(`[browser] Applying ${name} ...`)
      let applied = false
      let result = runGit(
        ['apply', '--3way', '--ignore-whitespace', '--whitespace=nowarn', full],
        ctx.chromiumRoot
      )
      if (result.code === 0) {
        applied = true
        logger.success('  OK (git apply --3way)')
      } else {
        logger.warn(`  --3way failed (exit ${result.code}); trying git apply ...`)
        result = runGit(
          ['apply', '--ignore-whitespace', '--whitespace=nowarn', full],
          ctx.chromiumRoot
        )
        if (result.code === 0) {
          applied = true
          logger.success('  OK (git apply)')
        }
      }
      if (!applied) {
        logger.warn(
          `  WARNING: Could not apply ${name} (wire steps may still patch). See patches/README.md`
        )
      }
    }
  } else {
    logger.info('[browser] No patches directory; skipping git apply.')
  }

  logger.info('[browser] Running wire steps ...')
  runWireSteps(ctx)
  logger.success('[browser] apply done.')
}

export { ApplyAction }
