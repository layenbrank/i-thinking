import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface Reminder {
  id: string
  title: string
  notes: string
  dueAt: number | null
  endAt: number | null
  fireTime: string | null
  weekDays: string
  entireDay: boolean
  enabled: boolean
  snoozeUntil: number | null
  lastFiredAt: number | null
  priority: number
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}

interface ReminderWrite {
  title: string
  notes?: string
  dueAt?: number | null
  endAt?: number | null
  fireTime?: string | null
  weekDays?: string
  entireDay?: boolean
  enabled?: boolean
  snoozeUntil?: number | null
  priority?: number
}

interface ReminderChange {
  title?: string
  notes?: string
  dueAt?: number | null
  endAt?: number | null
  fireTime?: string | null
  weekDays?: string
  entireDay?: boolean
  enabled?: boolean
  snoozeUntil?: number | null
  priority?: number
  archivedAt?: number | null
}

interface ReminderUpdate {
  key: string
  change: ReminderChange
}

interface ReminderRead {
  id?: string
  title?: string
  enabled?: boolean
  includeArchived?: boolean
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
    immer(function (setter, getter) {
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
            const ids = await invoke<string[]>('reminder:write', {
              params: {
                title: value.title,
                notes: value.notes ?? '',
                dueAt: value.dueAt ?? null,
                endAt: value.endAt ?? null,
                fireTime: value.fireTime ?? null,
                weekDays: value.weekDays ?? '[]',
                entireDay: value.entireDay ?? false,
                enabled: value.enabled ?? true,
                snoozeUntil: value.snoozeUntil ?? null,
                priority: value.priority ?? 0
              }
            })
            await getter().readReminders()
            return ids[0]
          } catch (err) {
            console.error('[reminder-store] writeReminder failed:', err)
            return undefined
          }
        },

        async updateReminder(value) {
          const prev = getter().reminders
          setter(
            function (state) {
              const target = state.reminders.find(function (r) {
                return r.id === value.key
              })
              if (!target) return
              Object.assign(target, value.change)
            },
            false,
            'updateReminder/optimistic'
          )
          try {
            await invoke('reminder:update', { params: value })
            await getter().readReminders()
          } catch (err) {
            setter(
              function (state) {
                state.reminders = prev
              },
              false,
              'updateReminder/rollback'
            )
            console.error('[reminder-store] updateReminder failed:', err)
            throw err
          }
        },

        async removeReminder(key) {
          const prev = getter().reminders
          setter(
            function (state) {
              state.reminders = state.reminders.filter(function (r) {
                return r.id !== key
              })
            },
            false,
            'removeReminder/optimistic'
          )
          try {
            await invoke('reminder:remove', { params: key })
          } catch (err) {
            setter(
              function (state) {
                state.reminders = prev
              },
              false,
              'removeReminder/rollback'
            )
            console.error('[reminder-store] removeReminder failed:', err)
            throw err
          }
        }
      }
    }),
    { name: 'reminder-store' }
  )
)

export { useReminderStore }
export type { Reminder, ReminderChange, ReminderRead, ReminderUpdate, ReminderWrite }
