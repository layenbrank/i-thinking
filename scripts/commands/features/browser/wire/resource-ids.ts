import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText } from './text.ts'

const GRD_KEY =
  '"<(SHARED_INTERMEDIATE_DIR)/chrome/browser/resources/i_thinking/i_thinking_resources.grd"'
const GRD_ENTRY = `  "<(SHARED_INTERMEDIATE_DIR)/chrome/browser/resources/i_thinking/i_thinking_resources.grd": {
    "META": {"sizes": {"includes": [50]}},
    "includes": [4135],
  },
`
const INTRO_BLOCK_END =
  '  "<(SHARED_INTERMEDIATE_DIR)/chrome/browser/resources/iwa_dev/resources.grd"'

const ResourceIdsStep: WireStep = {
  id: 'resource-ids',
  description: 'tools/gritsettings/resource_ids.spec 登记 i_thinking grd',
  apply(ctx) {
    const filePath = path.join(
      ctx.chromiumRoot,
      'tools',
      'gritsettings',
      'resource_ids.spec'
    )
    if (!existsSync(filePath)) {
      logger.warn(`[wire] SKIP missing ${filePath}`)
      return
    }
    let text = readText(filePath)
    if (text.includes(GRD_KEY)) {
      logger.info('[wire] OK resource_ids.spec already has i_thinking')
      return
    }
    if (!text.includes(INTRO_BLOCK_END)) {
      logger.warn('[wire] WARN: add i_thinking grd to resource_ids.spec manually')
      return
    }
    text = text.replace(INTRO_BLOCK_END, GRD_ENTRY + INTRO_BLOCK_END)
    writeUtf8NoBom(filePath, text)
    logger.success('[wire] PATCHED resource_ids.spec')
  }
}

export { ResourceIdsStep }
