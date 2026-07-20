import { createRequire } from 'node:module'
import path from 'node:path'

type AppRequire = ReturnType<typeof createRequire>

/**
 * Forge Vite 将 main 打成 CJS 时 `import.meta.url` 会变成 undefined，
 * 因此路径与 createRequire 基于进程入口 / APP_ROOT。
 */
function findBundleDir(): string {
  const entry = process.argv[1]
  if (entry && path.isAbsolute(entry)) {
    return path.dirname(entry)
  }

  const root = process.env.APP_ROOT || process.cwd()
  return path.join(root, '.vite', 'build')
}

function findAppRoot(): string {
  if (process.env.APP_ROOT) return process.env.APP_ROOT
  // .vite/build -> 项目根（apps/studio）
  return path.resolve(findBundleDir(), '..', '..')
}

let cachedRequire: AppRequire | null = null

function findAppRequire(): AppRequire {
  if (cachedRequire) return cachedRequire
  const filename = path.join(findBundleDir(), 'main.js')
  cachedRequire = createRequire(filename)
  return cachedRequire
}

export { findAppRequire, findAppRoot, findBundleDir }
