import { useMemo, useSyncExternalStore } from 'react'
import type { ConfigProviderProps } from 'antd'
import type { ThemeConfig } from 'antd'

import { APPEARANCE_PRESET } from '@/themes/appearance'
import { buildTheme } from '@/themes/runtime/build'
import { parseSystemTheme } from '@/themes/schemes/schemes'
import { useSettingsStore } from '@/stores/setting'

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
  const loaded = useSettingsStore(function (state) {
    return state.loaded
  })
  const appearance = useSettingsStore(function (state) {
    return state.settings.appearance
  })
  const systemTheme = useSystemThemeSnapshot()
  const resolved = loaded ? appearance : APPEARANCE_PRESET
  return useMemo(
    function () {
      return buildTheme(resolved)
    },
    [resolved, loaded, systemTheme]
  )
}

export type ProviderProps = Pick<ConfigProviderProps, 'theme' | 'componentSize' | 'variant'>

export function useProviderProps(): ProviderProps {
  const loaded = useSettingsStore(function (state) {
    return state.loaded
  })
  const appearance = useSettingsStore(function (state) {
    return state.settings.appearance
  })
  const systemTheme = useSystemThemeSnapshot()
  const resolved = loaded ? appearance : APPEARANCE_PRESET
  return useMemo(
    function () {
      return {
        theme: buildTheme(resolved),
        componentSize: resolved.size,
        variant: resolved.variant
      }
    },
    [resolved, loaded, systemTheme]
  )
}
