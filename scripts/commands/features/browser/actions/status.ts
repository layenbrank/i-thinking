import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { printContext } from '../infra/config.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const StatusAction: BrowserAction = {
  name: 'status',
  description: '1. 检查工作区、工具链与 chrome.exe 是否就绪',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runStatus(ctx)
      })
  }
}

function runStatus(ctx: BrowserContext): void {
  printContext(ctx)

  const depotOk = existsSync(path.join(ctx.depotTools, 'gclient.py'))
  const srcOk = existsSync(path.join(ctx.chromiumRoot, 'BUILD.gn'))
  const chromeOk = existsSync(path.join(ctx.outDir, 'chrome.exe'))
  const paksOk = existsSync(path.join(ctx.chromiumRoot, 'chrome', 'chrome_paks.gni'))

  const status = {
    product: ctx.config.productName,
    package: '@i-thinking/browser',
    workspace: ctx.workspaceRoot,
    browserRoot: ctx.browserRoot,
    depotTools: ctx.depotTools,
    chromiumCheckout: ctx.chromiumCheckout,
    chromiumRoot: ctx.chromiumRoot,
    depotToolsPresent: depotOk,
    chromiumSrcPresent: srcOk,
    chromeExePresent: chromeOk,
    chromePaksPresent: paksOk,
    updatedAt: new Date().toISOString()
  }

  const cacheDir = path.join(ctx.browserRoot, '.cache')
  mkdirSync(cacheDir, { recursive: true })
  const statusFile = path.join(cacheDir, 'chromium-status.json')
  writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8')
  logger.success(`[browser] Wrote ${statusFile}`)
  console.log(JSON.stringify(status, null, 2))
}

export { StatusAction }
