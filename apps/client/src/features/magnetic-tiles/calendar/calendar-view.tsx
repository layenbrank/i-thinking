import type { CalendarProps } from 'antd'
import type { CalendarMode } from 'antd/es/calendar'
import { Calendar, Col, Radio, Row, Select } from 'antd'
import { createStyles } from 'antd-style'
import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { HolidayUtil, Lunar } from 'lunar-typescript'
import React from 'react'

import stylesChrome from '@/features/magnetic-tiles/calendar/calendar-view.module.scss'

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
  return {
    wrapper: css`
      width: 100%;
      height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      background: ${token.colorBgContainer};
    `,
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
        transition: background-color 200ms ease;
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
    current: css`
      color: ${token.colorPrimary};
      &:before {
        background: ${token.colorPrimaryBg};
        border-color: ${token.colorPrimary};
      }
      .${cx(lunar)} {
        color: ${token.colorPrimary};
      }
      .${cx(weekend)} {
        color: ${token.colorPrimary};
      }
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
    weekend
  }
})

type CalendarViewProps = {
  embedded?: boolean
  onClose?: () => void
}

function CalendarView(props: CalendarViewProps = {}) {
  const { embedded = false, onClose: _onClose } = props
  void _onClose
  const { styles } = useStyle()

  const [selectDate, onUpdateSelectDate] = React.useState<Dayjs>(function () {
    return dayjs()
  })
  const [panelDate, onUpdatePanelDate] = React.useState<Dayjs>(function () {
    return dayjs()
  })

  function handlePanelChange(value: Dayjs, _mode: CalendarMode) {
    onUpdatePanelDate(value)
  }

  const handleDateChange: CalendarProps<Dayjs>['onSelect'] = function (value, selectInfo) {
    if (selectInfo.source === 'date') {
      onUpdateSelectDate(value)
    }
  }

  const cellRender: CalendarProps<Dayjs>['fullCellRender'] = function (date, info) {
    const lunarDay = Lunar.fromDate(date.toDate())
    const lunar = lunarDay.getDayInChinese()
    const solarTerm = lunarDay.getJieQi()
    const isWeekend = date.day() === 6 || date.day() === 0
    const holiday = HolidayUtil.getHoliday(
      date.get('year'),
      date.get('month') + 1,
      date.get('date')
    )
    const displayHoliday =
      holiday?.getTarget() === holiday?.getDay() ? holiday?.getName() : undefined

    if (info.type === 'date') {
      return React.cloneElement(info.originNode, {
        ...(info.originNode as React.ReactElement<{ className?: string }>).props,
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
            <div className={styles.lunar}>{displayHoliday || solarTerm || lunar}</div>
          </div>
        )
      })
    }

    if (info.type === 'month') {
      const lunarMonth = Lunar.fromDate(new Date(date.get('year'), date.get('month')))
      const monthName = lunarMonth.getMonthInChinese()
      return (
        <div
          className={clsx(styles.monthCell, {
            [styles.monthCellCurrent]: selectDate.isSame(date, 'month')
          })}>
          {date.get('month') + 1}月（{monthName}月）
        </div>
      )
    }

    return info.originNode
  }

  function findYearLabel(year: number) {
    const d = Lunar.fromDate(new Date(year + 1, 0))
    return `${d.getYearInChinese()}年（${d.getYearInGanZhi()}${d.getYearShengXiao()}年）`
  }

  function findMonthLabel(month: number, value: Dayjs) {
    const d = Lunar.fromDate(new Date(value.year(), month))
    return `${month + 1}月（${d.getMonthInChinese()}月）`
  }

  return (
    <div
      className={clsx(styles.wrapper, stylesChrome.calendar, embedded && stylesChrome.embedded)}
      data-through="false">
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
            <Row
              className={stylesChrome.toolbar}
              justify="end"
              gutter={8}
              {...(embedded ? {} : { 'data-region': 'true' })}>
              <Col>
                <Select
                  size="middle"
                  popupMatchSelectWidth={false}
                  value={year}
                  options={yearOptions}
                  onChange={function (newYear) {
                    onChange(value.clone().year(newYear))
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
                    onChange(value.clone().month(newMonth))
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
    </div>
  )
}

export default CalendarView
export type { CalendarViewProps }
