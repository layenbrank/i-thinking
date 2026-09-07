import { useMemo, useSyncExternalStore } from 'react'
import type { ConfigProviderProps, ThemeConfig } from 'antd'

import { APPEARANCE_PRESET } from '@/themes/appearance'
import { buildTheme } from '@/themes/runtime/build'
import { parseSystemTheme } from '@/themes/schemes/schemes'

const SYSTEM_MEDIA = '(prefers-color-scheme: dark)'

function subscribeSystemTheme(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return function () {}
  }
  const media = window.matchMedia(SYSTEM_MEDIA)
  media.addEventListener('change', onChange)
  return function () {
    media.removeEventListener('change', onChange)
  }
}

function useSystemThemeSnapshot(): 'light' | 'dark' {
  return useSyncExternalStore(subscribeSystemTheme, parseSystemTheme, function () {
    return 'light'
  })
}

export function useTheme(): ThemeConfig {
  const systemTheme = useSystemThemeSnapshot()

  return {}
}

export type ProviderProps = Pick<ConfigProviderProps, 'theme' | 'componentSize' | 'variant'>

// export function useProviderProps(): ProviderProps {}
