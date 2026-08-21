/**
 * 运行时解析 `@/*` → `scripts/*`（Node 原生跑 .ts 时使用）。
 *
 * package.json: `node --import ./scripts/alias.ts ./scripts/xxx.ts`
 */

import { registerHooks } from 'node:module'
import { dirname, extname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPTS_ROOT = dirname(fileURLToPath(import.meta.url))

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (!specifier.startsWith('@/')) {
      return nextResolve(specifier, context)
    }

    const rel = specifier.slice(2)
    const withExt = extname(rel) ? rel : `${rel}.ts`
    const resolved = pathToFileURL(join(SCRIPTS_ROOT, withExt)).href
    return nextResolve(resolved, context)
  }
})
