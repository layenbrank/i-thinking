import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import type { BrowserConfig, BrowserContext } from '../types.ts'
import { BROWSER_PACKAGE, CONFIG_PATH, OVERLAY_REL, PATCHES_REL } from './paths.ts'

function readConfig(): BrowserConfig {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(`[browser] 缺少配置: ${CONFIG_PATH}`)
  }
  const raw = readFileSync(CONFIG_PATH, 'utf8')
  return JSON.parse(raw) as BrowserConfig
}

function pickPath(envName: string, fromConfig: string): string {
  const fromEnv = process.env[envName]
  if (fromEnv && fromEnv.length > 0) {
    return fromEnv
  }
  return fromConfig
}

function createContext(): BrowserContext {
  const config = readConfig()
  const workspaceRoot = pickPath('ITHINKING_BROWSER_WORKSPACE', config.workspaceRoot)
  const depotTools = pickPath('ITHINKING_DEPOT_TOOLS', config.depotTools)
  const chromiumCheckout = pickPath('ITHINKING_CHROMIUM_CHECKOUT', config.chromiumCheckout)
  const chromiumRoot = pickPath('ITHINKING_CHROMIUM_ROOT', config.chromiumRoot)
  const gitCache = pickPath('ITHINKING_GIT_CACHE', config.gitCache)
  const outRel = config.outDir.replace(/\\/g, '/')
  const outDir = path.join(chromiumRoot, ...outRel.split('/'))
  const webuiDist = path.join(BROWSER_PACKAGE, config.webuiDist.replace(/\//g, path.sep))

  return {
    browserRoot: BROWSER_PACKAGE,
    workspaceRoot,
    depotTools,
    chromiumCheckout,
    chromiumRoot,
    gitCache,
    outDir,
    outRel,
    webuiDist,
    overlayRoot: path.join(BROWSER_PACKAGE, OVERLAY_REL),
    patchesDir: path.join(BROWSER_PACKAGE, PATCHES_REL),
    config
  }
}

function printContext(ctx: BrowserContext): void {
  logger.dim(`WORKSPACE=${ctx.workspaceRoot}`)
  logger.dim(`DEPOT_TOOLS=${ctx.depotTools}`)
  logger.dim(`CHROMIUM_CHECKOUT=${ctx.chromiumCheckout}`)
  logger.dim(`CHROMIUM_ROOT=${ctx.chromiumRoot}`)
  logger.dim(`GIT_CACHE_PATH=${ctx.gitCache}`)
  logger.dim(`BROWSER_ROOT=${ctx.browserRoot}`)
  logger.dim(`OUT=${ctx.outDir}`)
}

export { createContext, printContext, readConfig }
