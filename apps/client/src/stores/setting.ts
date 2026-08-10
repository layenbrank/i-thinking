import { LazyStore } from '@tauri-apps/plugin-store'
import { create } from 'zustand'

import { syncAutostart } from '@/features/magnetic-tiles/settings/autostart'
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
  toInitialize: () => Promise<void>
  toUpdate: <K extends keyof Setting.Composite>(
    section: K,
    value: Partial<Setting.Composite[K]>
  ) => Promise<void>
  toReset: () => Promise<void>
  toResetAppearance: () => Promise<void>
}

export const useSettingsStore = create<SettingsStore>(function (setter, getter) {
  return {
    settings: SETTINGS,
    loaded: false,

    async toInitialize() {
      if (getter().loaded) return
      await settingStore.init()

      const settings = { ...SETTINGS }
      for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
        const val = await settingStore.get<Setting.Composite[typeof key]>(key)

        if (val !== undefined) {
          settings[key] = { ...SETTINGS[key], ...val } as never
        }
      }

      try {
        const enabled = await syncAutostart(settings.general.autostart)
        settings.general = { ...settings.general, autostart: enabled }
        await settingStore.set('general', settings.general)
      } catch (error) {
        console.warn('[settings] syncAutostart on init failed', error)
      }

      setter({ settings, loaded: true })
    },

    async toUpdate(section, value) {
      const current = getter().settings
      const merged = { ...current[section], ...value }

      if (section === 'general' && 'autostart' in value) {
        const desired = (value as Partial<Setting.General>).autostart
        if (typeof desired === 'boolean') {
          const enabled = await syncAutostart(desired)
          ;(merged as Setting.General).autostart = enabled
        }
      }

      setter({ settings: { ...current, [section]: merged } })
      await settingStore.set(section, merged)
    },

    async toReset() {
      setter({ settings: SETTINGS })
      await settingStore.reset()
      try {
        await syncAutostart(SETTINGS.general.autostart)
      } catch (error) {
        console.warn('[settings] syncAutostart on reset failed', error)
      }
    },

    async toResetAppearance() {
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
