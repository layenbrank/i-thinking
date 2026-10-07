import { cpSync, existsSync, mkdirSync, readFileSync, realpathSync } from 'node:fs'
import path from 'node:path'

/**
 * 将 Vite external 模块（vite.main.config.mts 的 rollupOptions.external）
 * 及其运行时依赖闭包复制进 build 目录。
 *
 * pnpm hoisted 模式下这些包位于仓库根 node_modules/，
 * @electron/packager 只复制 app 源目录的 node_modules/，hoisted 依赖不会自动进入构建产物。
 * 而 Fuses OnlyLoadAppFromAsar 要求所有运行时模块必须在 asar 内部。
 *
 * 必须是依赖闭包：只复制包本体时 better-sqlite3 会在 require('bindings') 处崩溃；
 * 若构建机仓库根恰好有同名的 hoisted 包，模块解析会逸出 asar 借到它，
 * 缺陷只在产物离开构建仓库后（装到用户机器 / 换机）才暴露。
 */

const EXTERNAL_PACKAGES = ['better-sqlite3']

/** 仅安装期使用的依赖（如 better-sqlite3 的 install 脚本），运行时不会被 require */
const INSTALL_ONLY_PACKAGES = new Set(['prebuild-install'])

const SKIP_DIR_NAMES = new Set([
  'src',
  'docs',
  'doc',
  'test',
  'tests',
  'example',
  'examples',
  '.github'
])

function canCopyPath(src: string, pkgDir: string, platform: string, arch: string): boolean {
  const relative = path.relative(pkgDir, src).replace(/\\/g, '/')
  if (!relative || relative.startsWith('..')) return true
  if (relative.endsWith('.map')) return false
  const parts = relative.split('/')
  if (parts.some(function (part) {
    return SKIP_DIR_NAMES.has(part)
  })) {
    return false
  }
  if (parts[0] === 'prebuilds') {
    const wanted = `${platform}-${arch}`
    if (parts.length === 1) return true
    return parts[1] === wanted || parts[1].startsWith(`${wanted}-`)
  }
  return true
}

function copyExternalDependencies(
  buildPath: string,
  _electronVersion: string,
  platform: string,
  arch: string,
  done: (err?: Error) => void
): void {
  try {
    const destNm = path.join(buildPath, 'node_modules')
    const seen = new Set<string>()
    const queue: string[] = [...EXTERNAL_PACKAGES]

    while (queue.length > 0) {
      const name = queue.shift()!
      // realpathSync：pnpm 软链布局下要复制实体，asar 存链接会在运行时失效
      const pkgDir = realpathSync(path.dirname(require.resolve(name + '/package.json')))

      if (seen.has(pkgDir)) continue
      seen.add(pkgDir)

      const pkgJson = JSON.parse(readFileSync(path.join(pkgDir, 'package.json'), 'utf-8'))
      for (const dep of Object.keys(pkgJson.dependencies || {})) {
        if (!INSTALL_ONLY_PACKAGES.has(dep)) queue.push(dep)
      }

      const dest = path.join(destNm, name)
      if (existsSync(dest)) continue
      mkdirSync(path.dirname(dest), { recursive: true })
      cpSync(pkgDir, dest, {
        recursive: true,
        dereference: true,
        filter(src) {
          return canCopyPath(src, pkgDir, platform, arch)
        }
      })
    }

    done()
  } catch (error) {
    // 交给 Forge 的 done 之前先出声：构建日志里要留痕
    console.warn('[forge] 复制外部依赖失败', error)
    done(error instanceof Error ? error : new Error(String(error)))
  }
}

export { copyExternalDependencies }
