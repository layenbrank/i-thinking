import { copyFileSync, existsSync, renameSync, rmSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { assertPath, ensureDir } from '../infra/fs.ts'
import { RUNTIME_GLOBS, STAGE_DIR, STAGE_SUBDIRS } from '../infra/paths.ts'
import { runRobocopy } from '../infra/run.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const StageAction: BrowserAction = {
  name: 'stage',
  description: '9. 抽出运行时并生成 i-thinking.exe',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runStage(ctx)
      })
  }
}

function runStage(ctx: BrowserContext): void {
  assertPath(ctx.outDir, 'Build output')
  const chromeExe = path.join(ctx.outDir, 'chrome.exe')
  assertPath(chromeExe, 'chrome.exe')

  logger.info(`[browser] Preparing ${STAGE_DIR} ...`)
  if (existsSync(STAGE_DIR)) {
    rmSync(STAGE_DIR, { recursive: true, force: true })
  }
  ensureDir(STAGE_DIR)

  logger.info(`[browser] Copying runtime from ${ctx.outDir} -> ${STAGE_DIR}`)
  runRobocopy([
    ctx.outDir,
    STAGE_DIR,
    ...RUNTIME_GLOBS,
    '/S',
    '/NFL',
    '/NDL',
    '/NJH',
    '/NJS',
    '/NC',
    '/NS'
  ])

  for (const sub of STAGE_SUBDIRS) {
    const srcSub = path.join(ctx.outDir, sub)
    if (!existsSync(srcSub)) {
      continue
    }
    logger.info(`[browser] Copying ${sub} ...`)
    runRobocopy([
      srcSub,
      path.join(STAGE_DIR, sub),
      '/E',
      '/NFL',
      '/NDL',
      '/NJH',
      '/NJS',
      '/NC',
      '/NS'
    ])
  }

  const stagedChrome = path.join(STAGE_DIR, 'chrome.exe')
  const stagedProduct = path.join(STAGE_DIR, 'i-thinking.exe')
  if (existsSync(stagedChrome)) {
    logger.info('[browser] Renaming chrome.exe -> i-thinking.exe')
    if (existsSync(stagedProduct)) {
      rmSync(stagedProduct, { force: true })
    }
    renameSync(stagedChrome, stagedProduct)
  } else {
    logger.warn('[browser] chrome.exe missing after copy; check out dir layout.')
  }

  const chromeVisual = path.join(STAGE_DIR, 'chrome.VisualElementsManifest.xml')
  const productVisual = path.join(STAGE_DIR, 'i-thinking.VisualElementsManifest.xml')
  if (existsSync(chromeVisual) && !existsSync(productVisual)) {
    copyFileSync(chromeVisual, productVisual)
  }

  logger.success('[browser] stage done.')
  logger.info(`[browser] Runtime: ${STAGE_DIR}`)
  if (existsSync(stagedProduct)) {
    logger.info(`[browser] Launcher: ${stagedProduct}`)
  }
}

export { StageAction }
