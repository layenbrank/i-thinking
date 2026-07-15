import type { CalendarProps } from 'antd'
import type { CalendarMode } from 'antd/es/calendar'
import { Calendar, Col, Radio, Row, Select } from 'antd'
import { createStyles } from 'antd-style'
import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { HolidayUtil, Lunar } from 'lunar-typescript'
import React from 'react'

// import { timeSphere } from '@i-thinking/utils'

import stylem from '@/views/calendar/calendar.module.scss'

const useStyle = createStyles(({ token, css, cx }) => {
  const lunar = css`
    color: ${token.colorTextTertiary};
    font-size: ${token.fontSizeSM}px;
  `
  const weekend = css`
    color: ${token.colorError};
    &.gray {
      opacity: 0.4;
    }
  `
  return {
    wrapper: css`
      // border: 1px solid ${token.colorBorderSecondary};
      // border-radius: ${token.borderRadiusOuter}px;
      // padding: 10px;
    `,
    dateCell: css`
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      &:before {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(-50%);
        background: transparent;
        transition: background-color 300ms;
        border-radius: ${token.borderRadiusOuter}px;
        border: 1px solid transparent;
        box-sizing: border-box;
      }
      &:hover:before {
        background: rgba(0, 0, 0, 0.04);
      }
    `,
    today: css`
      &:before {
        border: 1px solid ${token.colorPrimary};
      }
    `,
    text: css`
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      position: relative;
      z-index: 1;
    `,
    lunar,
    current: css`
      color: #4080ff;
      &:before {
        background: #f0f0f0;
      }
      &:hover:before {
        background: ${token.colorPrimary};
        opacity: 0.8;
      }
      .${cx(lunar)} {
        color: #4080ff;
        opacity: 0.9;
      }
      .${cx(weekend)} {
        color: #4080ff;
      }
    `,
    monthCell: css`
      width: 120px;
      color: ${token.colorTextBase};
      border-radius: ${token.borderRadiusOuter}px;
      padding: 5px 0;
      &:hover {
        background: rgba(0, 0, 0, 0.04);
      }
    `,
    monthCellCurrent: css`
      color: ${token.colorTextLightSolid};
      background: ${token.colorPrimary};
      &:hover {
        background: ${token.colorPrimary};
        opacity: 0.8;
      }
    `,
    weekend
  }
})

export interface CalendarViewProps {
  embedded?: boolean
  onClose?: () => void
}

const Component: React.FC<CalendarViewProps> = function (props = {}) {
  const { embedded = false, onClose } = props
  const { styles } = useStyle({ test: true })

  const [selectDate, setSelectDate] = React.useState<Dayjs>(() => dayjs())
  const [panelDate, setPanelDate] = React.useState<Dayjs>(() => dayjs())

  const onPanelChange = (value: Dayjs, mode: CalendarMode) => {
    console.log(value.format('YYYY-MM-DD'), mode)
    setPanelDate(value)
  }

  const onDateChange: CalendarProps<Dayjs>['onSelect'] = (value, selectInfo) => {
    if (selectInfo.source === 'date') {
      setSelectDate(value)
    }
  }

  const cellRender: CalendarProps<Dayjs>['fullCellRender'] = (date, info) => {
    const d = Lunar.fromDate(date.toDate())
    const lunar = d.getDayInChinese()
    const solarTerm = d.getJieQi()
    const isWeekend = date.day() === 6 || date.day() === 0
    const h = HolidayUtil.getHoliday(date.get('year'), date.get('month') + 1, date.get('date'))
    const displayHoliday = h?.getTarget() === h?.getDay() ? h?.getName() : undefined

    const map: Partial<Record<typeof info.type, () => React.ReactNode>> = {
      date() {
        return React.cloneElement(info.originNode, {
          ...(info.originNode as React.ReactElement<any>).props,
          className: clsx(styles.dateCell, {
            [styles.current]: selectDate.isSame(date, 'date'),
            [styles.today]: date.isSame(dayjs(), 'date')
          }),
          children: (
            <div className={styles.text}>
              <span
                className={clsx({
                  [styles.weekend]: isWeekend,
                  gray: !panelDate.isSame(date, 'month')
                })}>
                {date.get('date')}
              </span>
              {info.type === 'date' && (
                <div className={styles.lunar}>{displayHoliday || solarTerm || lunar}</div>
              )}
            </div>
          )
        })
      },
      month() {
        // Due to the fact that a solar month is part of the lunar month X and part of the lunar month X+1,
        // when rendering a month, always take X as the lunar month of the month
        const d2 = Lunar.fromDate(new Date(date.get('year'), date.get('month')))
        const month = d2.getMonthInChinese()
        return (
          <div
            className={clsx(styles.monthCell, {
              [styles.monthCellCurrent]: selectDate.isSame(date, 'month')
            })}>
            {date.get('month') + 1}月（{month}月）
          </div>
        )
      }
    }
    return map?.[info.type]?.()
  }

  const getYearLabel = (year: number) => {
    const d = Lunar.fromDate(new Date(year + 1, 0))
    return `${d.getYearInChinese()}年（${d.getYearInGanZhi()}${d.getYearShengXiao()}年）`
  }

  const getMonthLabel = (month: number, value: Dayjs) => {
    const d = Lunar.fromDate(new Date(value.year(), month))
    const lunar = d.getMonthInChinese()
    return `${month + 1}月（${lunar}月）`
  }

  return (
    <div
      className={clsx(styles.wrapper, stylem.calendar)}
      data-through="false">
      {embedded ? (
        <div
          data-region="true"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 10px 0'
          }}>
          <span style={{ fontSize: 13, opacity: 0.72 }}>日历</span>
          {onClose ? (
            <button
              type="button"
              aria-label="关闭日历"
              onClick={onClose}
              style={{
                border: 0,
                background: 'transparent',
                cursor: 'pointer',
                fontSize: 16,
                lineHeight: 1
              }}>
              ×
            </button>
          ) : null}
        </div>
      ) : null}
      <Calendar
        fullCellRender={cellRender}
        fullscreen={false}
        onPanelChange={onPanelChange}
        onSelect={onDateChange}
        headerRender={({ value, type, onChange, onTypeChange }) => {
          const start = 0
          const end = 12
          const monthOptions = []

          let current = value.clone()
          const localeData = value.localeData()
          const months = []
          for (let i = 0; i < 12; i++) {
            current = current.month(i)
            months.push(localeData.monthsShort(current))
          }

          for (let i = start; i < end; i++) {
            monthOptions.push({
              label: getMonthLabel(i, value),
              value: i
            })
          }

          const year = value.year()
          const month = value.month()
          const options = []
          for (let i = year - 10; i < year + 10; i += 1) {
            options.push({
              label: getYearLabel(i),
              value: i
            })
          }
          return (
            <Row
              data-region="true"
              justify="end"
              gutter={8}
              style={{ padding: 8 }}>
              <Col>
                <Select
                  size="small"
                  popupMatchSelectWidth={false}
                  className="my-year-select"
                  value={year}
                  options={options}
                  onChange={(newYear) => {
                    const now = value.clone().year(newYear)
                    onChange(now)
                  }}
                />
              </Col>
              <Col>
                <Select
                  size="small"
                  popupMatchSelectWidth={false}
                  value={month}
                  options={monthOptions}
                  onChange={(newMonth) => {
                    const now = value.clone().month(newMonth)
                    onChange(now)
                  }}
                />
              </Col>
              <Col>
                <Radio.Group
                  size="small"
                  onChange={(e) => onTypeChange(e.target.value)}
                  value={type}>
                  <Radio.Button value="month">月</Radio.Button>
                  <Radio.Button value="year">年</Radio.Button>
                </Radio.Group>
              </Col>
            </Row>
          )
        }}
      />
    </div>
  )
}

export default Component
