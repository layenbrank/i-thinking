#!/usr/bin/env node
/**
 * 带**侧车档位**跑 electron-forge。
 *
 *   node scripts/run-forge.mjs <package|make|publish> [lite|full] [...forge 参数]
 *
 * 为什么要这个 runner：档位经 `STUDIO_SIDECAR_VARIANT` 传给 `forge/env.ts`，而
 * `VAR=value electron-forge …` 这种前置赋值在 Windows 的 cmd/pwsh 里不成立（仓库不引 cross-env）。
 * 解析 `@electron-forge/cli` 的 bin 后用当前 Node 起子进程，参数不经过 shell，两边都干净。
 *
 * 默认 lite：pandoc / ffmpeg / opencode 不进安装包，由 Studio 运行时在线下载。
 */
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import path from 'node:path'

const require = createRequire(import.meta.url)

const VARIANTS = new Set(['lite', 'full'])
const ACTIONS = new Set(['package', 'make', 'publish', 'start'])

const [, , action, ...rest] = process.argv
if (!action || !ACTIONS.has(action)) {
  console.error(
    `用法: node scripts/run-forge.mjs <${[...ACTIONS].join('|')}> [lite|full] [...参数]`
  )
  process.exit(1)
}

const variant = VARIANTS.has(rest[0]) ? rest.shift() : 'lite'

function findForgeBin() {
  const pkgPath = require.resolve('@electron-forge/cli/package.json')
  const pkg = require(pkgPath)
  const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.['electron-forge']
  if (!bin) throw new Error('@electron-forge/cli 没声明 electron-forge bin')
  return path.join(path.dirname(pkgPath), bin)
}

const result = spawnSync(process.execPath, [findForgeBin(), action, ...rest], {
  stdio: 'inherit',
  env: { ...process.env, STUDIO_SIDECAR_VARIANT: variant }
})

console.log(`[forge] 侧车档位: ${variant}`)
process.exit(result.status ?? 1)
