import type { CalendarProps } from 'antd'
import type { CalendarMode } from 'antd/es/calendar'
import { Calendar, Radio, Select } from 'antd'
import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { calendar, timeSphere } from '@i-thinking/utils'
import React from 'react'

import styles from '@/features/magnetic-tiles/calendar/day-grid.module.scss'

type DayGridProps = {
  selectDate: Dayjs
  panelDate: Dayjs
  markedDates: Set<string>
  onSelectDate(date: Dayjs): void
  onPanelDate(date: Dayjs): void
}

function findYearLabel(year: number) {
  const key = `${year}-06-15`
  const cycle = calendar.sixtyCycle(key)
  const lunarYear = calendar.format(key, 'lY')
  return `${lunarYear}年（${cycle.heavenStem}${cycle.earthBranch}${cycle.zodiac}年）`
}

function findMonthLabel(month: number, value: Dayjs) {
  const key = timeSphere.format(value.month(month).date(15).toDate(), 'YYYY-MM-DD')
  const lunarMonth = calendar.format(key, 'lM')
  return `${month + 1}月（${lunarMonth}）`
}

function findCellCaption(date: Dayjs): { text: string; isFestival: boolean } {
  const key = timeSphere.format(date.toDate(), 'YYYY-MM-DD')
  const legal = calendar.legalHoliday(key)?.name
  if (legal) return { text: legal, isFestival: true }
  const festival = calendar.festival(key)
  if (festival) return { text: festival, isFestival: true }
  const term = calendar.term(key)
  if (term) return { text: term, isFestival: true }
  return { text: calendar.format(key, 'lD'), isFestival: false }
}

function DayGrid(props: DayGridProps) {
  const { selectDate, panelDate, markedDates, onSelectDate, onPanelDate } = props

  function handlePanelChange(value: Dayjs, _mode: CalendarMode) {
    onPanelDate(value)
  }

  const handleDateChange: CalendarProps<Dayjs>['onSelect'] = function (value, selectInfo) {
    if (selectInfo.source === 'date' || selectInfo.source === 'month') {
      onSelectDate(value)
    }
  }

  const cellRender: CalendarProps<Dayjs>['fullCellRender'] = function (date, info) {
    if (info.type === 'date') {
      const isWeekend = date.day() === 6 || date.day() === 0
      const isCurrent = selectDate.isSame(date, 'date')
      const isToday = date.isSame(dayjs(), 'date')
      const key = timeSphere.format(date.toDate(), 'YYYY-MM-DD')
      const caption = findCellCaption(date)
      const hasMark = markedDates.has(key)
      const isOutside = !panelDate.isSame(date, 'month')

      const origin = info.originNode as React.ReactElement<{
        className?: string
        children?: React.ReactNode
      }>

      return React.cloneElement(origin, {
        className: clsx(styles.dateCell, {
          [styles.current]: isCurrent,
          [styles.today]: isToday && !isCurrent,
          [styles.outside]: isOutside && !isCurrent
        }),
        children: (
          <div className={styles.text}>
            <span className={clsx(styles.dayNum, isWeekend && styles.weekend)}>{date.date()}</span>
            <div className={clsx(styles.lunar, caption.isFestival && styles.festival)}>
              {caption.text}
            </div>
            <span className={styles.markSlot} aria-hidden={!hasMark}>
              {hasMark ? (
                <span className={clsx(styles.mark, isCurrent && styles.markOnCurrent)} />
              ) : null}
            </span>
          </div>
        )
      })
    }

    if (info.type === 'month') {
      const lunarMonth = calendar.format(
        timeSphere.format(new Date(date.year(), date.month(), 15), 'YYYY-MM-DD'),
        'lM'
      )
      const isCurrent = selectDate.isSame(date, 'month') && selectDate.isSame(date, 'year')
      const isThisMonth = dayjs().isSame(date, 'month') && dayjs().isSame(date, 'year')
      const origin = info.originNode as React.ReactElement<{
        className?: string
        children?: React.ReactNode
      }>

      return React.cloneElement(origin, {
        className: clsx(styles.monthCell, {
          [styles.monthCellCurrent]: isCurrent,
          [styles.monthCellToday]: isThisMonth && !isCurrent
        }),
        children: (
          <div className={styles.monthText}>
            <div className={styles.monthPrimary}>
              <span className={styles.monthNum}>{date.month() + 1}</span>
              <span className={styles.monthUnit}>月</span>
            </div>
            <span className={styles.monthLunar}>{lunarMonth}</span>
          </div>
        )
      })
    }

    return info.originNode
  }

  return (
    <Calendar
      fullCellRender={cellRender}
      fullscreen={false}
      onPanelChange={handlePanelChange}
      onSelect={handleDateChange}
      headerRender={function ({ value, type, onChange, onTypeChange }) {
        const monthOptions = []
        for (let i = 0; i < 12; i++) {
          monthOptions.push({
            label: findMonthLabel(i, value),
            value: i
          })
        }

        const year = value.year()
        const month = value.month()
        const yearOptions = []
        for (let i = year - 10; i < year + 10; i += 1) {
          yearOptions.push({
            label: findYearLabel(i),
            value: i
          })
        }

        return (
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <Select
                size="small"
                popupMatchSelectWidth={false}
                value={year}
                options={yearOptions}
                onChange={function (newYear) {
                  const next = value.clone().year(newYear)
                  onChange(next)
                  onPanelDate(next)
                }}
              />
              <Select
                size="middle"
                popupMatchSelectWidth={false}
                value={month}
                options={monthOptions}
                onChange={function (newMonth) {
                  const next = value.clone().month(newMonth)
                  onChange(next)
                  onPanelDate(next)
                }}
              />
            </div>
            <div className={styles.toolbarRight}>
              <Radio.Group
                size="small"
                optionType="button"
                buttonStyle="solid"
                onChange={function (e) {
                  onTypeChange(e.target.value)
                }}
                value={type}
                options={[
                  { label: '月', value: 'month' },
                  { label: '年', value: 'year' }
                ]}
              />
            </div>
          </div>
        )
      }}
    />
  )
}

export { DayGrid }
export type { DayGridProps }
