import { existsSync, renameSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { ensureDir, writeUtf8NoBom, writeWorkspaceReadme } from '../infra/fs.ts'
import type { BrowserAction, BrowserContext } from '../types.ts'

const MIGRATE_MOVES: ReadonlyArray<{ from: string; label: string; toKey: 'depot' | 'checkout' | 'cache' }> =
  [
    { from: 'D:\\depot_tools', label: 'depot_tools', toKey: 'depot' },
    { from: 'D:\\src\\chromium', label: 'chromium checkout', toKey: 'checkout' },
    { from: 'D:\\src\\git_cache', label: 'git-cache', toKey: 'cache' }
  ]

const MigrateAction: BrowserAction = {
  name: 'migrate',
  description: '3. （可选）把旧目录迁到 config 约定的工作区',
  register(parent, ctx) {
    parent
      .command(this.name)
      .description(this.description)
      .action(function () {
        runMigrate(ctx)
      })
  }
}

function findDest(ctx: BrowserContext, key: 'depot' | 'checkout' | 'cache'): string {
  const map = {
    depot: ctx.depotTools,
    checkout: ctx.chromiumCheckout,
    cache: ctx.gitCache
  }
  return map[key]
}

function moveIfNeeded(from: string, to: string, label: string): void {
  if (!existsSync(from)) {
    logger.info(`[browser] SKIP ${label} (missing): ${from}`)
    return
  }
  if (existsSync(to)) {
    logger.info(`[browser] SKIP ${label} (target exists): ${to}`)
    return
  }
  ensureDir(path.dirname(to))
  logger.info(`[browser] MOVE ${label}:`)
  logger.dim(`  ${from}`)
  logger.dim(`  -> ${to}`)
  renameSync(from, to)
}

function runMigrate(ctx: BrowserContext): void {
  ensureDir(ctx.workspaceRoot)
  writeWorkspaceReadme(ctx)

  for (const item of MIGRATE_MOVES) {
    moveIfNeeded(item.from, findDest(ctx, item.toKey), item.label)
  }

  const pointer = 'D:\\src\\MOVED-TO-i-thinking-browser.txt'
  if (!existsSync('D:\\src\\chromium') && existsSync('D:\\src')) {
    writeUtf8NoBom(
      pointer,
      [
        'chromium / git_cache 已迁至：',
        `  ${ctx.workspaceRoot}`,
        '',
        '请改用: pnpm command browser …',
        '旧路径 D:\\src\\chromium 与 D:\\depot_tools 已废弃。',
        ''
      ].join('\n')
    )
  }

  logger.success('[browser] migrate done.')
  logger.info(`[browser] Workspace: ${ctx.workspaceRoot}`)
  logger.info('[browser] Re-open a new shell, then: pnpm command browser bootstrap')
}

export { MigrateAction }
