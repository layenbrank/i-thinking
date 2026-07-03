import type { ThemeComponent, ThemeComponentKey } from '@/themes/antd'

import { FEEDBACK_RECIPES } from '@/themes/recipes/feedback'
import { FORM_RECIPES } from '@/themes/recipes/form'
import { LAYOUT_RECIPES } from '@/themes/recipes/layout'

export const RECIPES: ThemeComponent = mergeComponents(
  LAYOUT_RECIPES,
  FORM_RECIPES,
  FEEDBACK_RECIPES
)

export function mergeComponents(...parts: ThemeComponent[]): ThemeComponent {
  let merged: ThemeComponent = {}
  for (const part of parts) {
    for (const key of Object.keys(part) as ThemeComponentKey[]) {
      const current = merged[key]
      const next = part[key]
      if (next === undefined) continue

      const bucket =
        current && typeof current === 'object' && typeof next === 'object'
          ? {
              ...(current as Record<string, unknown>),
              ...(next as Record<string, unknown>)
            }
          : next
      merged = {
        ...merged,
        [key]: bucket
      } as ThemeComponent
    }
  }
  return merged
}
