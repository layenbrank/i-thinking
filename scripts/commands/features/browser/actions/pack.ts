import { existsSync, mkdirSync } from 'node:fs'

import { logger } from '../../../core/logger.ts'
import { assertPath } from '../infra/fs.ts'
import { BUILD_ROOT, NSI_PATH, STAGE_DIR } from '../infra/paths.ts'
import { runCommand } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const PackAction: BrowserAction = {
  name: 'pack',
  description: '10. 打 NSIS 安装包（需本机 makensis）',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runPack(ctx)
      })
  }
}

function runPack(ctx: BrowserContext): void {
  assertPath(NSI_PATH, 'NSIS script')
  assertPath(STAGE_DIR, 'Staged runtime (run browser stage first)')
  if (!existsSync(BUILD_ROOT)) {
    mkdirSync(BUILD_ROOT, { recursive: true })
  }
  runCommand('makensis', [NSI_PATH], { cwd: ctx.browserRoot })
  logger.success('[browser] pack done.')
}

export { PackAction }
