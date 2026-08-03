import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface Calendar {
  id: string
  title: string
  notes: string
  startAt: number
  endAt: number
  entireDay: boolean
  color: string | null
  reminderID: string | null
  archivedAt: number | null
  createdAt: number
  updatedAt: number
}

interface CalendarWrite {
  title: string
  notes?: string
  startAt: number
  endAt: number
  entireDay?: boolean
  color?: string | null
  reminderID?: string | null
}

interface CalendarChange {
  title?: string
  notes?: string
  startAt?: number
  endAt?: number
  entireDay?: boolean
  color?: string | null
  reminderID?: string | null
  archivedAt?: number | null
}

interface CalendarUpdate {
  key: string
  change: CalendarChange
}

interface CalendarRead {
  id?: string
  title?: string
  reminderID?: string
  archived?: boolean
  rangeFrom?: number
  rangeTo?: number
}

interface CalendarStore {
  events: Calendar[]
  loaded: boolean
  readEvents(filter?: CalendarRead): Promise<Calendar[]>
  writeEvent(value: CalendarWrite): Promise<string | undefined>
  updateEvent(value: CalendarUpdate): Promise<void>
  removeEvent(key: string): Promise<void>
}

const useCalendarStore = create<CalendarStore>()(
  devtools(
    immer(function (setter) {
      return {
        events: [],
        loaded: false,

        async readEvents(filter = {}) {
          try {
            const events = await invoke<Calendar[]>('calendar:read', {
              params: filter
            })
            setter(
              function (state) {
                state.events = events
                state.loaded = true
              },
              false,
              'readEvents'
            )
            return events
          } catch (err) {
            console.error('[calendar-store] readEvents failed:', err)
            setter(
              function (state) {
                state.loaded = true
              },
              false,
              'readEvents/error'
            )
            return []
          }
        },

        async writeEvent(value) {
          try {
            const ids = await invoke<string[]>('calendar:write', { params: value })
            return ids[0]
          } catch (err) {
            console.error('[calendar-store] writeEvent failed:', err)
            return undefined
          }
        },

        async updateEvent(value) {
          try {
            await invoke('calendar:update', { params: value })
          } catch (err) {
            console.error('[calendar-store] updateEvent failed:', err)
          }
        },

        async removeEvent(key) {
          try {
            await invoke('calendar:remove', { params: key })
          } catch (err) {
            console.error('[calendar-store] removeEvent failed:', err)
          }
        }
      }
    }),
    { name: 'calendar-store' }
  )
)

export { useCalendarStore }
export type { Calendar, CalendarChange, CalendarRead, CalendarUpdate, CalendarWrite }
