import { z } from 'zod'

import type { ThemeComponent } from '@/themes/antd'
import {
  APPEARANCE_PRESET,
  PROVIDER_VARIANTS,
  type Appearance,
  type ThemeDensity,
  type ThemeMode
} from '@/themes/appearance'
import { RECIPE_FIELD_INDEX } from '@/themes/recipes/meta'
import { mergeComponents } from '@/themes/recipes/recipes'

const THEME_MODES = ['light', 'dark', 'system'] as const satisfies readonly ThemeMode[]
const THEME_DENSITIES = ['default', 'compact'] as const satisfies readonly ThemeDensity[]

const AppearanceSchema = z.object({
  theme: z.enum(THEME_MODES),
  color: z.string().min(1),
  density: z.enum(THEME_DENSITIES),
  radius: z.number().min(2).max(16),
  fontSize: z.number().min(12).max(18),
  size: z.union([z.literal('small'), z.literal('middle'), z.literal('medium'), z.literal('large')]),
  variant: z.enum(PROVIDER_VARIANTS),
  components: z.record(z.string(), z.record(z.string(), z.unknown())).default({})
})

const AppearanceFileSchema = z.object({
  version: z.literal(1),
  appearance: AppearanceSchema
})

export function parseRecipePatch(input: ThemeComponent): ThemeComponent {
  const patches: ThemeComponent[] = []
  for (const field of RECIPE_FIELD_INDEX) {
    const component = input[field.component]
    if (!component || typeof component !== 'object') {
      continue
    }
    const value = (component as Record<string, unknown>)[field.token]
    if (value === undefined) {
      continue
    }
    patches.push({ [field.component]: { [field.token]: value } } as ThemeComponent)
  }
  return mergeComponents(...patches)
}

export function parseAppearance(raw: string): Appearance {
  const parsed = JSON.parse(raw) as unknown
  const file = AppearanceFileSchema.parse(parsed)
  return {
    ...file.appearance,
    components: parseRecipePatch(file.appearance.components as ThemeComponent)
  }
}

export function stringifyAppearance(appearance: Appearance): string {
  const payload = {
    version: 1 as const,
    appearance: {
      ...appearance,
      components: parseRecipePatch(appearance.components)
    }
  }
  return JSON.stringify(payload, null, 2)
}

export function parseAppearancePatch(patch: Partial<Appearance>): Appearance {
  return AppearanceSchema.parse({ ...APPEARANCE_PRESET, ...patch, components: patch.components ?? {} })
}
