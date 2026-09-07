import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { ensureDepotEnv } from '../infra/env.ts'
import { assertPath } from '../infra/fs.ts'
import { runCommand } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const BuildAction: BrowserAction = {
  name: 'build',
  description: '8. 编译浏览器（chrome）',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runBuild(ctx)
      })
  }
}

function runBuild(ctx: BrowserContext): void {
  ensureDepotEnv(ctx)
  assertPath(ctx.outDir, 'Output dir（先 configure）')

  logger.info(`[browser] Building: autoninja -C ${ctx.outRel} chrome`)
  runCommand('autoninja', ['-C', ctx.outRel, 'chrome'], {
    cwd: ctx.chromiumRoot
  })

  const chromeExe = path.join(ctx.outDir, 'chrome.exe')
  logger.success('[browser] build done.')
  if (existsSync(chromeExe)) {
    logger.info(`[browser] Binary: ${chromeExe}`)
  }
}

export { BuildAction }
