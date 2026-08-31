import { create } from 'zustand'

import { findITC } from '@/lib/itc.ts'
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

const STORAGE_PREFIX = 'studio.settings.'

function tryFindItc() {
  try {
    return findITC()
  } catch {
    return null
  }
}

async function readSection<K extends keyof Setting.Composite>(
  section: K
): Promise<Setting.Composite[K] | undefined> {
  const bridge = tryFindItc()
  if (bridge) {
    const value = await bridge.store.toRead({ key: section })
    if (value === null || value === undefined) return undefined
    return value as Setting.Composite[K]
  }

  if (typeof localStorage === 'undefined') return undefined
  const raw = localStorage.getItem(STORAGE_PREFIX + section)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as Setting.Composite[K]
  } catch {
    return undefined
  }
}

async function writeSection<K extends keyof Setting.Composite>(
  section: K,
  value: Setting.Composite[K]
): Promise<void> {
  const bridge = tryFindItc()
  if (bridge) {
    await bridge.store.toWrite({ key: section, value })
    return
  }

  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_PREFIX + section, JSON.stringify(value))
}

async function clearSections(): Promise<void> {
  const bridge = tryFindItc()
  if (bridge) {
    for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
      await bridge.store.toRemove({ key })
    }
    return
  }

  if (typeof localStorage === 'undefined') return
  for (const key of Object.keys(SETTINGS) as (keyof Setting.Composite)[]) {
    localStorage.removeItem(STORAGE_PREFIX + key)
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
