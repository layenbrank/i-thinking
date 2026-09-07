import { logger } from '../../../core/logger.ts'
import { assertPath, ensureDir } from '../infra/fs.ts'
import { runCommand } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const ExportPatchesAction: BrowserAction = {
  name: 'export-patches',
  description: '维护：把 Chromium 本地提交导出为 patches',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .option('--range <rev>', 'revision range', 'HEAD~4..HEAD')
      .action(function (opts: { range: string }) {
        runExportPatches(ctx, opts.range)
      })
  }
}

function runExportPatches(ctx: BrowserContext, revRange: string): void {
  assertPath(ctx.chromiumRoot, 'CHROMIUM_ROOT')
  ensureDir(ctx.patchesDir)
  logger.info(`[browser] git format-patch ${revRange} -o ${ctx.patchesDir}`)
  runCommand('git', ['format-patch', revRange, '-o', ctx.patchesDir], {
    cwd: ctx.chromiumRoot
  })
  logger.success('[browser] export-patches done.')
}

export { ExportPatchesAction }
