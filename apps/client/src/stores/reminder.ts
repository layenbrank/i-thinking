import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface Reminder {
  id: string
  title: string
  notes: string
  dueAt: number
  endAt: number | null
  isAllDay: boolean
  isCompleted: boolean
  completedAt: number | null
  priority: number
  createdAt: number
  updatedAt: number
}

interface ReminderWrite {
  title: string
  notes?: string
  dueAt: number
  endAt?: number | null
  isAllDay?: boolean
  isCompleted?: boolean
  completedAt?: number | null
  priority?: number
}

interface ReminderChange {
  title?: string
  notes?: string
  dueAt?: number
  endAt?: number | null
  isAllDay?: boolean
  isCompleted?: boolean
  completedAt?: number | null
  priority?: number
}

interface ReminderUpdate {
  key: string
  change: ReminderChange
}

interface ReminderRead {
  id?: string
  title?: string
  isCompleted?: boolean
  dueFrom?: number
  dueTo?: number
}

interface ReminderStore {
  reminders: Reminder[]
  loaded: boolean
  readReminders(filter?: ReminderRead): Promise<Reminder[]>
  writeReminder(value: ReminderWrite): Promise<string | undefined>
  updateReminder(value: ReminderUpdate): Promise<void>
  removeReminder(key: string): Promise<void>
}

const useReminderStore = create<ReminderStore>()(
  devtools(
    immer(function (setter) {
      return {
        reminders: [],
        loaded: false,

        async readReminders(filter = {}) {
          try {
            const reminders = await invoke<Reminder[]>('reminder:read', {
              params: filter
            })
            setter(
              function (state) {
                state.reminders = reminders
                state.loaded = true
              },
              false,
              'readReminders'
            )
            return reminders
          } catch (err) {
            console.error('[reminder-store] readReminders failed:', err)
            setter(
              function (state) {
                state.loaded = true
              },
              false,
              'readReminders/error'
            )
            return []
          }
        },

        async writeReminder(value) {
          try {
            const ids = await invoke<string[]>('reminder:write', { params: value })
            return ids[0]
          } catch (err) {
            console.error('[reminder-store] writeReminder failed:', err)
            return undefined
          }
        },

        async updateReminder(value) {
          try {
            await invoke('reminder:update', { params: value })
          } catch (err) {
            console.error('[reminder-store] updateReminder failed:', err)
          }
        },

        async removeReminder(key) {
          try {
            await invoke('reminder:remove', { params: key })
          } catch (err) {
            console.error('[reminder-store] removeReminder failed:', err)
          }
        }
      }
    }),
    { name: 'reminder-store' }
  )
)

export { useReminderStore }
export type { Reminder, ReminderChange, ReminderRead, ReminderUpdate, ReminderWrite }
