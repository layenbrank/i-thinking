export { PRIMARY_COLOR, PRIMARY_PALETTE } from '@/themes/foundation/palette'
export { FOUNDATION, mergeSeed, type SeedPatch } from '@/themes/foundation/foundation'

export type {
  ComponentSize,
  ComponentVariant,
  ThemeComponent,
  ThemeComponentKey,
  ThemeToken
} from '@/themes/antd'

export {
  APPEARANCE_PRESET,
  PROVIDER_VARIANTS,
  type Appearance,
  type ProviderVariant,
  type ThemeDensity,
  type ThemeMode
} from '@/themes/appearance'

export { RECIPES, mergeComponents } from '@/themes/recipes/recipes'
export {
  RECIPE_FIELDS,
  RECIPE_FIELD_INDEX,
  RECIPE_TABS,
  type RecipeField,
  type RecipeTab
} from '@/themes/recipes/meta'
export { PRESET } from '@/themes/presets/default'

export { CSSVAR, buildTheme } from '@/themes/runtime/build'
export { useProviderProps, useTheme, type ProviderProps } from '@/themes/runtime/theme'
export {
  parseAppearance,
  parseAppearancePatch,
  parseRecipePatch,
  stringifyAppearance
} from '@/themes/runtime/io'

export { parseScheme, parseSystemTheme, type ResolvedTheme } from '@/themes/schemes/schemes'
