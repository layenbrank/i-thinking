import type { MappingAlgorithm } from 'antd/es/theme/interface'

import type { ThemeDensity } from '@/themes/appearance'
import { COMPACT_ALGORITHM } from '@/themes/schemes/compact'
import { DARK_ALGORITHM } from '@/themes/schemes/dark'
import { LIGHT_ALGORITHM } from '@/themes/schemes/light'

export type ResolvedTheme = 'light' | 'dark'

export function parseSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'light'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function parseScheme(
  resolvedTheme: ResolvedTheme,
  density: ThemeDensity
): MappingAlgorithm | MappingAlgorithm[] {
  const base = resolvedTheme === 'dark' ? DARK_ALGORITHM : LIGHT_ALGORITHM
  if (density === 'compact') {
    return [base, COMPACT_ALGORITHM]
  }
  return base
}
