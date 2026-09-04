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

async function readSection<K extends keyof Setting.Composite>(
  section: K
): Promise<Setting.Composite[K] | undefined> {
  const value = await itc.store.toRead({ key: section })
  if (value === null || value === undefined) return undefined
  return value as Setting.Composite[K]
}

async function writeSection<K extends keyof Setting.Composite>(
  section: K,
  value: Setting.Composite[K]
): Promise<void> {
  await itc.store.toWrite({ key: section, value })
}

async function clearSections(): Promise<void> {
  for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
    await itc.store.toRemove({ key })
  }
}

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

      const settings = { ...SETTINGS }
      for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
        const val = await readSection(key)
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
      await writeSection(section, merged)
    },

    async reset() {
      setter({ settings: SETTINGS })
      await clearSections()
      for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
        await writeSection(key, SETTINGS[key])
      }
    },

    async resetAppearance() {
      const current = getter().settings
      setter({
        settings: {
          ...current,
          appearance: APPEARANCE_PRESET
        }
      })
      await writeSection('appearance', APPEARANCE_PRESET)
    }
  }
})
