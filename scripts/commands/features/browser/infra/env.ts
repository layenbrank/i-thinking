import { existsSync } from 'node:fs'
import path from 'node:path'

import type { BrowserContext } from '../types.ts'
import { GIT_CANDIDATES } from './paths.ts'

function ensureDepotEnv(ctx: BrowserContext): void {
  process.env.DEPOT_TOOLS_WIN_TOOLCHAIN = '0'
  process.env.DEPOT_TOOLS_UPDATE = '0'
  process.env.ITHINKING_BROWSER_WORKSPACE = ctx.workspaceRoot
  process.env.DEPOT_TOOLS = ctx.depotTools
  process.env.CHROMIUM_CHECKOUT = ctx.chromiumCheckout
  process.env.CHROMIUM_ROOT = ctx.chromiumRoot
  process.env.GIT_CACHE_PATH = ctx.gitCache

  const parts = process.env.PATH ? process.env.PATH.split(';') : []
  const prepend: string[] = []

  for (const gitDir of GIT_CANDIDATES) {
    if (existsSync(path.join(gitDir, 'git.exe'))) {
      if (!parts.includes(gitDir)) {
        prepend.push(gitDir)
      }
      break
    }
  }

  if (!parts.includes(ctx.depotTools)) {
    prepend.push(ctx.depotTools)
  }

  if (prepend.length > 0) {
    process.env.PATH = [...prepend, ...parts].join(';')
  }
}

export { ensureDepotEnv }
