import { invoke } from '@tauri-apps/api/core'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

interface CalendarEvent {
  id: string
  title: string
  notes: string
  startAt: number
  endAt: number
  isAllDay: boolean
  color: string | null
  reminderID: string | null
  createdAt: number
  updatedAt: number
}

interface CalendarEventWrite {
  title: string
  notes?: string
  startAt: number
  endAt: number
  isAllDay?: boolean
  color?: string | null
  reminderID?: string | null
}

interface CalendarEventChange {
  title?: string
  notes?: string
  startAt?: number
  endAt?: number
  isAllDay?: boolean
  color?: string | null
  reminderID?: string | null
}

interface CalendarEventUpdate {
  key: string
  change: CalendarEventChange
}

interface CalendarEventRead {
  id?: string
  title?: string
  reminderID?: string
  rangeFrom?: number
  rangeTo?: number
}

interface CalendarEventStore {
  events: CalendarEvent[]
  loaded: boolean
  readEvents(filter?: CalendarEventRead): Promise<CalendarEvent[]>
  writeEvent(value: CalendarEventWrite): Promise<string | undefined>
  updateEvent(value: CalendarEventUpdate): Promise<void>
  removeEvent(key: string): Promise<void>
}

const useCalendarEventStore = create<CalendarEventStore>()(
  devtools(
    immer(function (setter) {
      return {
        events: [],
        loaded: false,

        async readEvents(filter = {}) {
          try {
            const events = await invoke<CalendarEvent[]>('calendar-event:read', {
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
            console.error('[calendar-event-store] readEvents failed:', err)
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
            const ids = await invoke<string[]>('calendar-event:write', { params: value })
            return ids[0]
          } catch (err) {
            console.error('[calendar-event-store] writeEvent failed:', err)
            return undefined
          }
        },

        async updateEvent(value) {
          try {
            await invoke('calendar-event:update', { params: value })
          } catch (err) {
            console.error('[calendar-event-store] updateEvent failed:', err)
          }
        },

        async removeEvent(key) {
          try {
            await invoke('calendar-event:remove', { params: key })
          } catch (err) {
            console.error('[calendar-event-store] removeEvent failed:', err)
          }
        }
      }
    }),
    { name: 'calendar-event-store' }
  )
)

export { useCalendarEventStore }
export type {
  CalendarEvent,
  CalendarEventChange,
  CalendarEventRead,
  CalendarEventUpdate,
  CalendarEventWrite
}
