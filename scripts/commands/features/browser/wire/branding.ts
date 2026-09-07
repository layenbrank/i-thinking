import { existsSync } from 'node:fs'
import path from 'node:path'

import { logger } from '../../../core/logger.ts'
import { writeUtf8NoBom } from '../infra/fs.ts'
import type { WireStep } from '../types.ts'
import { readText } from './text.ts'

const INSTALL_MODE_FILES = [
  path.join('chrome', 'install_static', 'chromium_install_modes.cc'),
  path.join('chrome', 'install_static', 'google_chrome_install_modes.cc')
] as const

const BrandingStep: WireStep = {
  id: 'branding',
  description: 'install_modes 产品名 Chromium → i-thinking',
  apply(ctx) {
    for (const rel of INSTALL_MODE_FILES) {
      const filePath = path.join(ctx.chromiumRoot, rel)
      if (!existsSync(filePath)) {
        continue
      }
      let text = readText(filePath)
      if (!text.includes('L"Chromium"') || text.includes('L"i-thinking"')) {
        continue
      }
      text = text.replaceAll('L"Chromium"', 'L"i-thinking"')
      writeUtf8NoBom(filePath, text)
      logger.success(`[wire] PATCHED branding: ${filePath}`)
    }
  }
}

export { BrandingStep }
