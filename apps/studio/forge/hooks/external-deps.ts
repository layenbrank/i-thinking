import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

/**
 * 将 Vite external 模块（electron-updater）及其传递依赖复制进 build 目录。
 *
 * pnpm hoisted 模式下这些包位于仓库根 node_modules/，
 * @electron/packager 只复制 app 源目录的 node_modules/，hoisted 依赖不会自动进入构建产物。
 * 而 Fuses OnlyLoadAppFromAsar 要求所有运行时模块必须在 asar 内部。
 *
 * better-sqlite3 由 copyBetterSqlite3 单独处理（需 electron-rebuild 产物）。
 */

const EXTERNAL_PACKAGES = ['electron-updater']

function copyExternalDependencies(
  buildPath: string,
  _electronVersion: string,
  _platform: string,
  _arch: string,
  done: (err?: Error) => void
): void {
  try {
    const destNm = path.join(buildPath, 'node_modules')
    const seen = new Set<string>()
    const queue: string[] = [...EXTERNAL_PACKAGES]

    while (queue.length > 0) {
      const name = queue.shift()!
      const pkgJsonPath = require.resolve(name + '/package.json')
      const pkgDir = path.dirname(pkgJsonPath)
      const realPkgDir = path.resolve(pkgDir)

      if (seen.has(realPkgDir)) continue
      seen.add(realPkgDir)

      const pkgJson = JSON.parse(
        readFileSync(path.join(realPkgDir, 'package.json'), 'utf-8')
      )
      const deps = pkgJson.dependencies
      if (deps) {
        for (const dep of Object.keys(deps)) {
          queue.push(dep)
        }
      }

      const dest = path.join(destNm, name)
      if (!existsSync(dest)) {
        mkdirSync(path.dirname(dest), { recursive: true })
        cpSync(realPkgDir, dest, { recursive: true })
      }
    }

    done()
  } catch (error) {
    done(error instanceof Error ? error : new Error(String(error)))
  }
}

export { copyExternalDependencies }
