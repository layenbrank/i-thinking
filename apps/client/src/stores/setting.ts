import { LazyStore, Store, type StoreOptions } from '@tauri-apps/plugin-store'
import { create } from 'zustand'

declare namespace Setting {
  export interface General {
    autostart: boolean
    language: string
  }

  export interface Appearance {
    theme: 'light' | 'dark' | 'system'
    accentColor: string
  }

  export interface Screenshot {
    toClipboard: boolean
    toFile: boolean
    directory: string
    format: 'png' | 'jpg' | 'webp'
    quality: number
    // 截屏触发
    keycode: string
  }

  // 快捷启动应用
  export type KeyCode = Record<Application.Component, string>

  export interface Composite {
    general: General
    appearance: Appearance
    screenshot: Screenshot
    keycode: Partial<KeyCode>
  }
}

const SETTINGS: Setting.Composite = {
  general: {
    autostart: true,
    language: 'zh-CN'
  },
  appearance: {
    theme: 'system',
    accentColor: '#4080ff'
  },
  screenshot: {
    toClipboard: true,
    toFile: false,
    directory: '',
    format: 'png',
    quality: 100,
    keycode: 'Alt+S'
  },
  keycode: {}
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
        const val = await settingStore.get<Setting.Composite[ typeof key ]>( key )

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
    }
  }
})
