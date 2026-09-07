import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText } from './text.ts'

const PAK_SOURCE = '        "$root_gen_dir/chrome/i_thinking_resources.pak",'
const PAK_DEP = '        "//chrome/browser/resources/i_thinking:resources",'
const APP_HOME_SOURCE = '        "$root_gen_dir/chrome/app_home_resources.pak",'
const APP_HOME_DEP = '        "//chrome/browser/resources/app_home:resources",'

const ChromePaksStep: WireStep = {
  id: 'chrome-paks',
  description: 'chrome_paks.gni 纳入 i_thinking_resources.pak（修复 ERR_FAILED）',
  apply(ctx) {
    const filePath = path.join(ctx.chromiumRoot, 'chrome', 'chrome_paks.gni')
    if (!existsSync(filePath)) {
      logger.warn(`[wire] SKIP missing ${filePath}`)
      return
    }

    let text = readText(filePath)
    let changed = false

    if (text.includes('i_thinking_resources.pak')) {
      logger.info('[wire] OK chrome_paks.gni already has i_thinking pak source')
    } else if (text.includes(APP_HOME_SOURCE)) {
      text = text.replace(APP_HOME_SOURCE, `${APP_HOME_SOURCE}\n${PAK_SOURCE}`)
      changed = true
    } else {
      logger.warn('[wire] WARN: add i_thinking_resources.pak to chrome_paks.gni sources manually')
    }

    if (text.includes('//chrome/browser/resources/i_thinking:resources')) {
      logger.info('[wire] OK chrome_paks.gni already has i_thinking dep')
    } else if (text.includes(APP_HOME_DEP)) {
      text = text.replace(APP_HOME_DEP, `${APP_HOME_DEP}\n${PAK_DEP}`)
      changed = true
    } else {
      logger.warn('[wire] WARN: add i_thinking resources dep to chrome_paks.gni manually')
    }

    if (changed) {
      writeUtf8NoBom(filePath, text)
      logger.success('[wire] PATCHED chrome_paks.gni for i_thinking')
    }
  }
}

export { ChromePaksStep }
