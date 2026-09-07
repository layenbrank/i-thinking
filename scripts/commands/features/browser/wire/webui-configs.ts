import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { insertAfterExact, readText } from './text.ts'

const INCLUDE_LINE = '#include "chrome/browser/ui/webui/i_thinking/i_thinking_ui.h"'
const I_THINKING_DEP = '    "//chrome/browser/ui/webui/i_thinking",'
const ABOUT_DEP = '    "//chrome/browser/ui/webui/about",'
const ACCESSIBILITY_MARKER =
  '  map.AddWebUIConfig(std::make_unique<AccessibilityUIConfig>());'

const WebuiConfigsStep: WireStep = {
  id: 'webui-configs',
  description: '注册 IThinkingUIConfig 与 ui/webui BUILD.gn deps',
  apply(ctx) {
    const configs = path.join(
      ctx.chromiumRoot,
      'chrome',
      'browser',
      'ui',
      'webui',
      'chrome_web_ui_configs.cc'
    )
    insertAfterExact(
      configs,
      '#include "chrome/browser/ui/webui/chrome_web_ui_configs.h"',
      INCLUDE_LINE,
      'i_thinking/i_thinking_ui.h'
    )

    if (!existsSync(configs)) {
      return
    }

    let cfg = readText(configs)
    if (cfg.includes('IThinkingUIConfig')) {
      logger.info('[wire] OK IThinkingUIConfig already registered')
    } else if (cfg.includes(ACCESSIBILITY_MARKER)) {
      cfg = cfg.replace(
        ACCESSIBILITY_MARKER,
        `  map.AddWebUIConfig(std::make_unique<IThinkingUIConfig>());\r\n${ACCESSIBILITY_MARKER}`
      )
      writeUtf8NoBom(configs, cfg)
      logger.success('[wire] PATCHED IThinkingUIConfig registration')
    } else {
      logger.warn('[wire] WARN: add IThinkingUIConfig manually in chrome_web_ui_configs.cc')
    }

    const webuiBuild = path.join(
      ctx.chromiumRoot,
      'chrome',
      'browser',
      'ui',
      'webui',
      'BUILD.gn'
    )
    if (!existsSync(webuiBuild)) {
      return
    }

    let gn = readText(webuiBuild)
    if (gn.includes('//chrome/browser/ui/webui/i_thinking')) {
      logger.info('[wire] OK BUILD.gn already has i_thinking dep')
      return
    }
    if (!gn.includes(ABOUT_DEP)) {
      logger.warn('[wire] WARN: add i_thinking dep to chrome/browser/ui/webui/BUILD.gn manually')
      return
    }
    const idx = gn.indexOf(ABOUT_DEP)
    gn =
      gn.slice(0, idx + ABOUT_DEP.length) +
      `\n${I_THINKING_DEP}` +
      gn.slice(idx + ABOUT_DEP.length)
    writeUtf8NoBom(webuiBuild, gn)
    logger.success('[wire] PATCHED ui/webui BUILD.gn deps')
  }
}

export { WebuiConfigsStep }
