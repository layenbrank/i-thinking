import type { ThemeComponent, ThemeComponentKey } from '@/themes/antd'

import { DATA_DISPLAY_RECIPES } from '@/themes/recipes/data-display'
import { FEEDBACK_RECIPES } from '@/themes/recipes/feedback'
import { FORM_RECIPES } from '@/themes/recipes/form'
import { LAYOUT_RECIPES } from '@/themes/recipes/layout'
import { NAVIGATION_RECIPES } from '@/themes/recipes/navigation'

export const RECIPES: ThemeComponent = mergeComponents(
  LAYOUT_RECIPES,
  NAVIGATION_RECIPES,
  FORM_RECIPES,
  DATA_DISPLAY_RECIPES,
  FEEDBACK_RECIPES
)

export function mergeComponents(...parts: ThemeComponent[]): ThemeComponent {
  const merged: ThemeComponent = {}
  for (const part of parts) {
    for (const key of Object.keys(part) as ThemeComponentKey[]) {
      const current = merged[key]
      const next = part[key]
      if (next === undefined) continue

      // 联合键写入时 TS 要求交集类型；Object.assign 绕过该限制且保留运行时合并语义
      Object.assign(merged, {
        [key]:
          current && typeof current === 'object' && typeof next === 'object'
            ? { ...current, ...next }
            : next
      })
    }
  }
  return merged
}
