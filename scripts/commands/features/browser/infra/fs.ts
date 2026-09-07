import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import type { BrowserContext } from '../types.ts'

function writeUtf8NoBom(filePath: string, text: string): void {
  writeFileSync(filePath, text, { encoding: 'utf8' })
}

function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true })
}

function assertPath(filePath: string, label: string): void {
  if (!existsSync(filePath)) {
    throw new Error(`[browser] ${label} 不存在: ${filePath}`)
  }
}

function writeWorkspaceReadme(ctx: BrowserContext): void {
  const readme = path.join(ctx.workspaceRoot, 'README.txt')
  if (existsSync(readme)) {
    return
  }
  ensureDir(ctx.workspaceRoot)
  writeUtf8NoBom(
    readme,
    [
      'i-thinking browser — Chromium 本机工作区（勿当临时目录删除）',
      '',
      '本目录与 monorepo 中的 apps/browser 配合使用：',
      '  - depot_tools\\     Google 拉取/编译工具链',
      '  - chromium\\        gclient 工作区（含 .gclient 与 src\\）',
      '  - chromium\\src\\    Chromium 源码树（体积很大）',
      '  - git-cache\\       git 对象缓存（可选）',
      '',
      '产品 WebUI / 补丁在 monorepo：',
      '  <repo>\\apps\\browser',
      '',
      '不要删除本文件夹除非你确认不再编译 Chromium。',
      ''
    ].join('\n')
  )
  logger.info(`[browser] 写入 ${readme}`)
}

export { assertPath, ensureDir, writeUtf8NoBom, writeWorkspaceReadme }
