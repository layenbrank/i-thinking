import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { timeSphere } from '@i-thinking/utils'

import { DayAgenda } from '@/features/magnetic-tiles/calendar/day-agenda'
import { DayDetail } from '@/features/magnetic-tiles/calendar/day-detail'
import { DayGrid } from '@/features/magnetic-tiles/calendar/day-grid'
import styles from '@/features/magnetic-tiles/calendar/calendar-view.module.scss'
import { useCalendarEventStore } from '@/stores/calendar-event'
import { useReminderStore } from '@/stores/reminder'

type CalendarViewProps = {
  embedded?: boolean
  onClose?: () => void
}

function dayBounds(date: Dayjs): { from: number; to: number } {
  const start = date.startOf('day')
  return {
    from: start.valueOf(),
    to: start.add(1, 'day').valueOf()
  }
}

function monthBounds(date: Dayjs): { from: number; to: number } {
  const start = date.startOf('month').startOf('week')
  const end = date.endOf('month').endOf('week').add(1, 'day')
  return {
    from: start.valueOf(),
    to: end.valueOf()
  }
}

function CalendarView(props: CalendarViewProps = {}) {
  const { embedded = false, onClose: _onClose } = props
  void _onClose

  const [selectDate, onUpdateSelectDate] = useState<Dayjs>(function () {
    return dayjs()
  })
  const [panelDate, onUpdatePanelDate] = useState<Dayjs>(function () {
    return dayjs()
  })

  const events = useCalendarEventStore(function (state) {
    return state.events
  })
  const reminders = useReminderStore(function (state) {
    return state.reminders
  })
  const readEvents = useCalendarEventStore(function (state) {
    return state.readEvents
  })
  const writeEvent = useCalendarEventStore(function (state) {
    return state.writeEvent
  })
  const removeEvent = useCalendarEventStore(function (state) {
    return state.removeEvent
  })
  const readReminders = useReminderStore(function (state) {
    return state.readReminders
  })
  const writeReminder = useReminderStore(function (state) {
    return state.writeReminder
  })
  const updateReminder = useReminderStore(function (state) {
    return state.updateReminder
  })
  const removeReminder = useReminderStore(function (state) {
    return state.removeReminder
  })

  async function refreshRange(anchor: Dayjs) {
    const range = monthBounds(anchor)
    await Promise.all([
      readEvents({ rangeFrom: range.from, rangeTo: range.to }),
      readReminders({ dueFrom: range.from, dueTo: range.to })
    ])
  }

  useEffect(
    function () {
      void refreshRange(panelDate)
    },
    // 仅在面板月份变化时拉取区间数据
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [panelDate.format('YYYY-MM')]
  )

  const dayRange = useMemo(function () {
    return dayBounds(selectDate)
  }, [selectDate])

  const dayEvents = useMemo(
    function () {
      return events.filter(function (event) {
        return event.endAt >= dayRange.from && event.startAt < dayRange.to
      })
    },
    [events, dayRange]
  )

  const dayReminders = useMemo(
    function () {
      return reminders.filter(function (reminder) {
        return reminder.dueAt >= dayRange.from && reminder.dueAt < dayRange.to
      })
    },
    [reminders, dayRange]
  )

  const markedDates = useMemo(
    function () {
      const marks = new Set<string>()
      for (const event of events) {
        marks.add(timeSphere.format(new Date(event.startAt), 'YYYY-MM-DD'))
      }
      for (const reminder of reminders) {
        marks.add(timeSphere.format(new Date(reminder.dueAt), 'YYYY-MM-DD'))
      }
      return marks
    },
    [events, reminders]
  )

  async function handleWriteEvent(title: string, notes: string) {
    const bounds = dayBounds(selectDate)
    await writeEvent({
      title,
      notes,
      startAt: bounds.from,
      endAt: bounds.to - 1,
      isAllDay: true
    })
    await refreshRange(panelDate)
  }

  async function handleWriteReminder(title: string, notes: string) {
    const bounds = dayBounds(selectDate)
    await writeReminder({
      title,
      notes,
      dueAt: bounds.from + 9 * 60 * 60 * 1000,
      isAllDay: false,
      priority: 0
    })
    await refreshRange(panelDate)
  }

  async function handleToggleReminder(id: string, isCompleted: boolean) {
    await updateReminder({
      key: id,
      change: { isCompleted }
    })
    await refreshRange(panelDate)
  }

  async function handleRemoveEvent(id: string) {
    await removeEvent(id)
    await refreshRange(panelDate)
  }

  async function handleRemoveReminder(id: string) {
    await removeReminder(id)
    await refreshRange(panelDate)
  }

  return (
    <div className={clsx(styles.calendar, embedded && styles.embedded)} data-through="false">
      <div className={styles.layout}>
        <div className={clsx(styles.main, styles.gridPane)}>
          <DayGrid
            selectDate={selectDate}
            panelDate={panelDate}
            markedDates={markedDates}
            onSelectDate={function (date) {
              onUpdateSelectDate(date)
              if (!panelDate.isSame(date, 'month')) {
                onUpdatePanelDate(date)
              }
            }}
            onPanelDate={function (date) {
              onUpdatePanelDate(date)
            }}
          />
        </div>
        <aside className={styles.side}>
          <DayAgenda
            date={selectDate}
            events={dayEvents}
            reminders={dayReminders}
            onWriteEvent={handleWriteEvent}
            onWriteReminder={handleWriteReminder}
            onToggleReminder={handleToggleReminder}
            onRemoveEvent={handleRemoveEvent}
            onRemoveReminder={handleRemoveReminder}
          />
          <DayDetail date={selectDate} />
        </aside>
      </div>
    </div>
  )
}

export default CalendarView
export type { CalendarViewProps }
