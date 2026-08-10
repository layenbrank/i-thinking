import { useEffect, useMemo } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { findCapacity, isWide, markerClass } from '@/features/magnetic-tile/marker'
import {
  findClockReminders,
  findEnabledCount,
  findNextReminder,
  findTodayEnabledCount
} from '@/features/magnetic-tiles/clock/alarm-time'
import {
  AnalogFace,
  DigitalDigits,
  MinimalTime
} from '@/features/magnetic-tiles/clock/clock-faces.tsx'
import { findDayPeriod } from '@/features/magnetic-tiles/clock/day-period.ts'
import { FlipClock } from '@/features/magnetic-tiles/clock/flip-digit.tsx'
import styles from '@/features/magnetic-tiles/clock/marker.module.scss'
import { useSecondTick } from '@/features/magnetic-tiles/clock/use-second-tick.ts'
import { useClockStore } from '@/stores/clock'
import { useReminderStore } from '@/stores/reminder'

type Props = Omit<MarkerProps, 'children'>

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function Marker(props: Props) {
  const clockStyle = useClockStore(function (s) {
    return s.clockStyle
  })
  const reminders = useReminderStore(function (s) {
    return s.reminders
  })
  const toReadReminders = useReminderStore(function (s) {
    return s.toReadReminders
  })
  const now = useSecondTick()

  useEffect(
    function () {
      void toReadReminders()
    },
    [toReadReminders]
  )

  useEffect(
    function () {
      let unlisten: (() => void) | undefined
      void import('@tauri-apps/api/event').then(function (mod) {
        void mod
          .listen('reminder:fired', function () {
            void toReadReminders()
          })
          .then(function (fn) {
            unlisten = fn
          })
      })
      return function () {
        unlisten?.()
      }
    },
    [toReadReminders]
  )

  const capacity = findCapacity(props.size, props.shape, props.direction)
  const wide = isWide(props.shape, props.direction)
  const isFlip = clockStyle === 'flip'
  const isMinimal = clockStyle === 'minimal'
  const isCircle = props.shape === 'circle'

  const showSeconds =
    !isMinimal && !isCircle && capacity >= (isFlip ? 3 : 2) && props.size >= (isFlip ? 2 : 1)
  const showAside = capacity >= 2 && !isCircle
  const showPeriod = capacity >= 3
  const showFullDate = capacity >= 4
  const showWeek = capacity >= 5
  const showNextAlarm = capacity >= 2
  const showAlarmSummary = capacity >= 3
  const showSecondAlarm = capacity >= 5
  const useFlipDots = props.size >= 3

  const h = pad(now.hour())
  const m = pad(now.minute())
  const s = pad(now.second())
  const tick = now.second()
  const period = findDayPeriod(now.hour())
  const dateLabel = showFullDate ? now.format('YYYY年M月D日') : now.format('M月D日')
  const weekday = now.format('dddd')
  const weekOfYear = Math.max(
    1,
    Math.ceil((now.diff(now.startOf('year'), 'day') + now.startOf('year').day() + 1) / 7)
  )

  const clockReminders = useMemo(
    function () {
      return findClockReminders(reminders)
    },
    [reminders]
  )

  const todayEnabled = useMemo(
    function () {
      return findTodayEnabledCount(clockReminders, now)
    },
    [clockReminders, now]
  )

  const enabledTotal = useMemo(
    function () {
      return findEnabledCount(clockReminders)
    },
    [clockReminders]
  )

  const nextReminders = useMemo(
    function () {
      if (!showNextAlarm) return []
      const first = findNextReminder(clockReminders, now)
      if (!first) return []
      if (!showSecondAlarm) return [first]
      const rest = clockReminders.filter(function (r) {
        return r.id !== first.reminder.id
      })
      const second = findNextReminder(rest, now)
      return second ? [first, second] : [first]
    },
    [clockReminders, now, showNextAlarm, showSecondAlarm]
  )

  return (
    <MagneticTile.Marker
      {...props}
      className={markerClass(
        styles,
        props.size,
        props.shape,
        props.direction,
        styles[clockStyle],
        wide && styles.wide,
        showAside && styles.hasAside
      )}>
      <div className={styles.body}>
        <div className={styles.stage}>
          {clockStyle === 'analog' ? <AnalogFace now={now} /> : null}

          {isFlip ? (
            <FlipClock
              hours={h}
              minutes={m}
              seconds={s}
              showSeconds={showSeconds}
              useDots={useFlipDots}
              className={styles.flipStage}
            />
          ) : null}

          {isMinimal ? (
            <MinimalTime
              h={h}
              m={m}
              s={s}
              showSeconds={showSeconds}
            />
          ) : null}

          {clockStyle === 'digital' || clockStyle === 'neon' ? (
            <DigitalDigits
              h={h}
              m={m}
              s={s}
              showSeconds={showSeconds}
              tick={tick}
            />
          ) : null}
        </div>

        {showAside ? (
          <aside className={styles.aside}>
            <div className={styles.metaBlock}>
              {showPeriod ? <span className={styles.period}>{period}</span> : null}
              <div className={styles.metaRow}>
                <span className={styles.date}>{dateLabel}</span>
                <span className={styles.weekday}>{weekday}</span>
                {showWeek ? <span className={styles.week}>第 {weekOfYear} 周</span> : null}
              </div>
            </div>

            {showNextAlarm ? (
              <div className={styles.alarmBlock}>
                {nextReminders.length > 0 ? (
                  nextReminders.map(function (item) {
                    return (
                      <div
                        key={item.reminder.id}
                        className={styles.alarmRow}>
                        <span className={styles.alarmLabel}>下个</span>
                        <span className={styles.alarmTime}>{item.reminder.fireTime}</span>
                        <span className={styles.alarmTitle}>{item.reminder.title || '闹钟'}</span>
                      </div>
                    )
                  })
                ) : (
                  <div className={styles.alarmEmpty}>暂无闹钟</div>
                )}
                {showAlarmSummary ? (
                  <div className={styles.alarmSummary}>
                    今日已开 {todayEnabled}
                    {enabledTotal !== todayEnabled ? ` · 全部 ${enabledTotal}` : ''}
                  </div>
                ) : null}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>
    </MagneticTile.Marker>
  )
}

export default Marker
