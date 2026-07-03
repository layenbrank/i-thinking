import { LazyStore } from '@tauri-apps/plugin-store'
import { create } from 'zustand'

import type { Appearance as ThemeAppearance } from '@/themes/appearance'
import { APPEARANCE_PRESET } from '@/themes/appearance'

declare namespace Setting {
  export interface General {
    autostart: boolean
    language: string
  }

  export type Appearance = ThemeAppearance

  export interface Composite {
    general: General
    appearance: Appearance
  }
}

const SETTINGS: Setting.Composite = {
  general: {
    autostart: true,
    language: 'zh-CN'
  },
  appearance: APPEARANCE_PRESET
}

const settingStore = new LazyStore('settings.json', {
  defaults: SETTINGS as unknown as Record<string, unknown>,
  autoSave: 300
})

interface SettingsStore {
  settings: Setting.Composite
  loaded: boolean
  initialize: () => Promise<void>
  update: <K extends keyof Setting.Composite>(
    section: K,
    value: Partial<Setting.Composite[K]>
  ) => Promise<void>
  reset: () => Promise<void>
  resetAppearance: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>(function (setter, getter) {
  return {
    settings: SETTINGS,
    loaded: false,

    async initialize() {
      if (getter().loaded) return
      await settingStore.init()

      const settings = { ...SETTINGS }
      for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
        const val = await settingStore.get<Setting.Composite[typeof key]>(key)

        if (val !== undefined) {
          settings[key] = { ...SETTINGS[key], ...val } as never
        }
      }

      setter({ settings, loaded: true })
    },

    async update(section, value) {
      const current = getter().settings
      const merged = { ...current[section], ...value }
      setter({ settings: { ...current, [section]: merged } })
      await settingStore.set(section, merged)
    },

    async reset() {
      setter({ settings: SETTINGS })
      await settingStore.reset()
    },

    async resetAppearance() {
      const current = getter().settings
      setter({
        settings: {
          ...current,
          appearance: APPEARANCE_PRESET
        }
      })
      await settingStore.set('appearance', APPEARANCE_PRESET)
    }
  }
})
