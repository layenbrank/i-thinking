import { createRequire, type Require } from 'node:module'
import path from 'node:path'

/**
 * Forge Vite 将 main 打成 CJS 时会把 `import.meta.url` 编译成 undefined，
 * 因此路径与 createRequire 必须基于进程入口 / APP_ROOT，不能依赖 import.meta。
 */
export function findBundleDir(): string {
  const entry = process.argv[1]
  if (entry && path.isAbsolute(entry)) {
    return path.dirname(entry)
  }

  const root = process.env.APP_ROOT || process.cwd()
  return path.join(root, '.vite', 'build')
}

export function findAppRoot(): string {
  if (process.env.APP_ROOT) return process.env.APP_ROOT
  // .vite/build -> 项目根（apps/studio）
  return path.resolve(findBundleDir(), '..', '..')
}

let cachedRequire: Require | null = null

export function findAppRequire(): Require {
  if (cachedRequire) return cachedRequire
  const filename = path.join(findBundleDir(), 'main.js')
  cachedRequire = createRequire(filename)
  return cachedRequire
}
