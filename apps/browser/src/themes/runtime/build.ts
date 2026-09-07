import type { ThemeConfig } from 'antd'

import type { Appearance } from '@/themes/appearance'
import { FOUNDATION, mergeSeed } from '@/themes/foundation/foundation'
import { mergeComponents, RECIPES } from '@/themes/recipes/recipes'
import { parseScheme, parseSystemTheme } from '@/themes/schemes/schemes'

export const CSSVAR = {
  PREFIX: 'ith',
  /** DOM class matching head-injected `.ith { --ith-*: ... }` rules (antd cssVar.key). */
  KEY: 'ith'
} as const

export function buildTheme(appearance: Appearance): ThemeConfig {
  const resolvedTheme = appearance.theme === 'system' ? parseSystemTheme() : appearance.theme
  const token = mergeSeed(FOUNDATION, {
    color: appearance.color,
    radius: appearance.radius,
    fontSize: appearance.fontSize
  })
  const algorithm = parseScheme(resolvedTheme, appearance.density)
  const components = mergeComponents(RECIPES, appearance.components)
  return {
    cssVar: {
      prefix: CSSVAR.PREFIX,
      key: CSSVAR.KEY
    },
    hashed: true,
    algorithm,
    token,
    components
  }
}
