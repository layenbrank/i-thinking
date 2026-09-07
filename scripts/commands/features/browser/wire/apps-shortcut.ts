import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import type { WireStep } from '../types.ts'
import { readText, replaceOnce } from './text.ts'

const AppsShortcutStep: WireStep = {
  id: 'apps-shortcut',
  description: 'Apps 快捷方式打开 chrome://i-thinking',
  apply(ctx) {
    const adapter = path.join(
      ctx.chromiumRoot,
      'chrome',
      'browser',
      'ui',
      'bookmarks',
      'controllers',
      'adapters',
      'desktop_bookmark_bar_action_adapter.cc'
    )
    if (!existsSync(adapter)) {
      logger.warn(`[wire] WARN: apps adapter not found: ${adapter}`)
      return
    }

    const text = readText(adapter)
    if (!text.includes('i_thinking_url_constants.h')) {
      replaceOnce(
        adapter,
        '#include "chrome/common/url_constants.h"',
        '#include "chrome/common/url_constants.h"\r\n#include "chrome/common/i_thinking_url_constants.h"'
      )
    }
    replaceOnce(
      adapter,
      'GURL(chrome::kChromeUIAppsURL)',
      'GURL(chrome::kChromeUIIThinkingURL)'
    )
  }
}

export { AppsShortcutStep }
