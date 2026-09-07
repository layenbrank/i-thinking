import type { ComponentSize, ComponentVariant, ThemeComponent } from '@/themes/antd'
import { PRIMARY_COLOR } from '@/themes/foundation/palette'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ThemeDensity = 'default' | 'compact'

export const PROVIDER_VARIANTS = ['outlined', 'filled', 'borderless'] as const
export type ProviderVariant = (typeof PROVIDER_VARIANTS)[number]

export interface Appearance {
  theme: ThemeMode
  color: string
  density: ThemeDensity
  radius: number
  fontSize: number
  size: ComponentSize
  variant: ComponentVariant
  components: ThemeComponent
}

export const APPEARANCE_PRESET: Appearance = {
  theme: 'system',
  color: PRIMARY_COLOR,
  density: 'default',
  radius: 6,
  fontSize: 14,
  size: 'middle',
  variant: 'outlined',
  components: {}
}
