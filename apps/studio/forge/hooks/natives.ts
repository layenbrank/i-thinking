import { cpSync, existsSync, mkdirSync, realpathSync } from 'node:fs'
import path from 'node:path'

import { PACKAGE_ROOT } from '../constants'

/**
 * 将 pnpm 链接下的 better-sqlite3 实体复制进 app 目录，供打包后 external require。
 */
function copyBetterSqlite3(
  buildPath: string,
  _electronVersion: string,
  _platform: string,
  _arch: string,
  done: (err?: Error) => void
): void {
  try {
    const candidates = [
      path.join(PACKAGE_ROOT, 'node_modules', 'better-sqlite3'),
      path.join(PACKAGE_ROOT, '..', '..', 'node_modules', 'better-sqlite3')
    ]

    let src: string | null = null
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        src = realpathSync(candidate)
        break
      }
    }

    if (src) {
      const dest = path.join(buildPath, 'node_modules', 'better-sqlite3')
      mkdirSync(path.dirname(dest), { recursive: true })
      cpSync(src, dest, { recursive: true })
    }

    done()
  } catch (error) {
    done(error instanceof Error ? error : new Error(String(error)))
  }
}

export { copyBetterSqlite3 }
