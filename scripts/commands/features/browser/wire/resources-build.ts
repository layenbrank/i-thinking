import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText } from './text.ts'

const RESOURCES_DEP = '      "i_thinking:resources",'
const APP_HOME_DEP = '      "app_home:resources",'

const ResourcesBuildStep: WireStep = {
  id: 'resources-build',
  description: 'chrome/browser/resources/BUILD.gn += i_thinking:resources',
  apply(ctx) {
    const filePath = path.join(
      ctx.chromiumRoot,
      'chrome',
      'browser',
      'resources',
      'BUILD.gn'
    )
    if (!existsSync(filePath)) {
      logger.warn(`[wire] SKIP missing ${filePath}`)
      return
    }
    let text = readText(filePath)
    if (text.includes('"i_thinking:resources"')) {
      logger.info('[wire] OK resources/BUILD.gn already has i_thinking')
      return
    }
    if (!text.includes(APP_HOME_DEP)) {
      logger.warn('[wire] WARN: add i_thinking:resources to resources/BUILD.gn manually')
      return
    }
    text = text.replace(APP_HOME_DEP, `${APP_HOME_DEP}\n${RESOURCES_DEP}`)
    writeUtf8NoBom(filePath, text)
    logger.success('[wire] PATCHED resources/BUILD.gn')
  }
}

export { ResourcesBuildStep }
