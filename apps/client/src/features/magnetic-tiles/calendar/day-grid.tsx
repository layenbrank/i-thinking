import type { CalendarProps } from 'antd'
import type { CalendarMode } from 'antd/es/calendar'
import { Calendar, Col, Radio, Row, Select } from 'antd'
import { createStyles } from 'antd-style'
import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { calendar, timeSphere } from '@i-thinking/utils'
import React from 'react'

type DayGridProps = {
  selectDate: Dayjs
  panelDate: Dayjs
  markedDates: Set<string>
  onSelectDate(date: Dayjs): void
  onPanelDate(date: Dayjs): void
}

const useStyle = createStyles(function ({ token, css, cx }) {
  const lunar = css`
    color: ${token.colorTextSecondary};
    font-size: ${token.fontSizeSM}px;
    line-height: 1.2;
  `
  const weekend = css`
    color: ${token.colorError};
    &.gray {
      opacity: 0.4;
    }
  `
  const festival = css`
    color: ${token.colorPrimary};
  `
  return {
    dateCell: css`
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      &:before {
        content: '';
        position: absolute;
        inset: 2px;
        background: transparent;
        transition:
          background-color 200ms ease,
          border-color 200ms ease;
        border-radius: ${token.borderRadius}px;
        border: 1px solid transparent;
        box-sizing: border-box;
      }
      &:hover:before {
        background: ${token.colorPrimaryBg};
      }
    `,
    today: css`
      &:before {
        border-color: ${token.colorPrimary};
      }
    `,
    text: css`
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 2px;
      position: relative;
      z-index: 1;
      color: ${token.colorText};
    `,
    lunar,
    festival,
    current: css`
      color: ${token.colorTextLightSolid};
      &:before {
        background: ${token.colorPrimary};
        border-color: ${token.colorPrimary};
      }
      .${cx(lunar)}, .${cx(festival)}, .${cx(weekend)} {
        color: ${token.colorTextLightSolid};
        opacity: 0.92;
      }
    `,
    mark: css`
      position: absolute;
      bottom: 4px;
      left: 50%;
      transform: translateX(-50%);
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: ${token.colorPrimary};
      z-index: 2;
    `,
    markOnCurrent: css`
      background: ${token.colorTextLightSolid};
    `,
    monthCell: css`
      width: 100%;
      max-width: 140px;
      margin: 0 auto;
      color: ${token.colorText};
      border-radius: ${token.borderRadius}px;
      padding: 10px 0;
      text-align: center;
      cursor: pointer;
      transition: background-color 200ms ease;
      &:hover {
        background: ${token.colorPrimaryBg};
      }
    `,
    monthCellCurrent: css`
      color: ${token.colorTextLightSolid};
      background: ${token.colorPrimary};
      &:hover {
        background: ${token.colorPrimaryHover};
        color: ${token.colorTextLightSolid};
      }
    `,
    weekend,
    toolbar: css`
      padding: 0 0 10px;
    `
  }
})

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
  const { styles } = useStyle()

  function handlePanelChange(value: Dayjs, _mode: CalendarMode) {
    onPanelDate(value)
  }

  const handleDateChange: CalendarProps<Dayjs>['onSelect'] = function (value, selectInfo) {
    if (selectInfo.source === 'date') {
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

      return React.cloneElement(info.originNode, {
        ...(info.originNode as React.ReactElement<{ className?: string }>).props,
        className: clsx(styles.dateCell, {
          [styles.current]: isCurrent,
          [styles.today]: isToday && !isCurrent
        }),
        children: (
          <div className={styles.text}>
            <span
              className={clsx({
                [styles.weekend]: isWeekend,
                gray: !panelDate.isSame(date, 'month')
              })}>
              {date.date()}
            </span>
            <div className={clsx(styles.lunar, caption.isFestival && styles.festival)}>
              {caption.text}
            </div>
            {hasMark ? (
              <span className={clsx(styles.mark, isCurrent && styles.markOnCurrent)} />
            ) : null}
          </div>
        )
      })
    }

    if (info.type === 'month') {
      const lunarMonth = calendar.format(
        timeSphere.format(new Date(date.year(), date.month(), 15), 'YYYY-MM-DD'),
        'lM'
      )
      return (
        <div
          className={clsx(styles.monthCell, {
            [styles.monthCellCurrent]: selectDate.isSame(date, 'month')
          })}>
          {date.month() + 1}月（{lunarMonth}）
        </div>
      )
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
          <Row className={styles.toolbar} justify="end" gutter={8}>
            <Col>
              <Select
                size="middle"
                popupMatchSelectWidth={false}
                value={year}
                options={yearOptions}
                onChange={function (newYear) {
                  const next = value.clone().year(newYear)
                  onChange(next)
                  onPanelDate(next)
                }}
              />
            </Col>
            <Col>
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
            </Col>
            <Col>
              <Radio.Group
                size="middle"
                onChange={function (e) {
                  onTypeChange(e.target.value)
                }}
                value={type}>
                <Radio.Button value="month">月</Radio.Button>
                <Radio.Button value="year">年</Radio.Button>
              </Radio.Group>
            </Col>
          </Row>
        )
      }}
    />
  )
}

export { DayGrid }
export type { DayGridProps }
