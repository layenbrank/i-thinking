import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText } from './text.ts'

const PREF_FILES = [
  path.join('chrome', 'browser', 'ui', 'browser_ui_prefs.cc'),
  path.join('chrome', 'browser', 'bookmarks', 'bookmark_utils.cc')
] as const

const AppsShortcutPrefStep: WireStep = {
  id: 'apps-shortcut-pref',
  description: '默认显示 Apps 快捷方式',
  apply(ctx) {
    for (const rel of PREF_FILES) {
      const filePath = path.join(ctx.chromiumRoot, rel)
      if (!existsSync(filePath)) {
        continue
      }
      const text = readText(filePath)
      if (!text.includes('kShowAppsShortcutInBookmarkBar')) {
        continue
      }
      const next = text.replace(
        /kShowAppsShortcutInBookmarkBar,\s*false/g,
        'kShowAppsShortcutInBookmarkBar, true'
      )
      if (next === text) {
        continue
      }
      writeUtf8NoBom(filePath, next)
      logger.success(`[wire] PATCHED apps shortcut pref: ${filePath}`)
    }
  }
}

export { AppsShortcutPrefStep }
