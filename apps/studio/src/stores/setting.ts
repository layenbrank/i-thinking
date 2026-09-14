import { create } from 'zustand'

import {
  DEFAULT_CHAT_TRANSPORT,
  type ChatTransportKind
} from '@/features/chat/transport.ts'

declare namespace Setting {
  export interface General {
    autostart: boolean
    language: string
  }

  export interface Chat {
    transport: ChatTransportKind
    /** 选中的本地 provider（null = 用第一个启用的） */
    providerID: string | null
    /** 模型覆盖（空 = 用 provider 默认 / 服务端 `AI_MODEL`） */
    model: string
  }

  export interface Composite {
    general: General
    chat: Chat
  }
}

const SETTINGS: Setting.Composite = {
  general: {
    autostart: true,
    language: 'zh-CN'
  },
  chat: {
    transport: DEFAULT_CHAT_TRANSPORT,
    providerID: null,
    model: ''
  }
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
    }
  }
})
