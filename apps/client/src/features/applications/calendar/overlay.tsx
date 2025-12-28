import { Calendar } from 'antd'
import clsx from 'clsx'

import { Application } from '@/features/application/application.tsx'
import styles from '@/features/applications/calendar/overlay.module.scss'
import { calendar, timeSphere } from '@i-thinking/core'
import type { CalendarProps } from 'antd/es/calendar'
import type { Dayjs } from 'dayjs'

interface Props {
  visible: boolean
  onUpdateVisible: (value: boolean) => void
}
// const now = timeSphere.parse('2025-10-29')
// const now = timeSphere.now()

// console.log('festival lunar', calendar.festival(now, 'year', 'lunar'))
// console.log('festival solar', calendar.festival(now, 'year', 'solar'))

// console.log(calendar.lunarDayInfo(now))

export default function Overlay(props: Props) {
  function findFestival(date: Dayjs) {
    let festival
    festival = calendar.festival(date, 'day', 'lunar')
    if (festival) return festival
    festival = calendar.festival(date, 'day', 'solar')
    if (festival) return festival

    festival = calendar.term(date)
    if (festival) return { festival }
    return null
  }

  function dateCellRender(date: Dayjs): React.ReactNode {
    // return findFestival(date)?.festival || null
    return 'happy'
  }

  function monthCellRender(date: Dayjs): React.ReactNode {
    return <div>{timeSphere.format(date, 'MM')}</div>
  }

  const cellRender: CalendarProps<Dayjs>['cellRender'] = function (date, info) {
    const { type } = info
    if (type === 'date') return dateCellRender(date)

    if (type === 'month') return monthCellRender(date)

    return info.originNode
  }

  return (
    <Application.Overlay
      open={props.visible}
      onOk={() => props.onUpdateVisible(false)}
      onCancel={() => props.onUpdateVisible(false)}>
      <Calendar
        cellRender={cellRender}
        styles={{
          content: {
            height: '100%'
          }
        }}
        classNames={{
          body: clsx([styles.calendar, styles.body]),
          content: clsx([styles.calendar, styles.content]),
          header: clsx([styles.calendar, styles.header]),
          item: clsx([styles.calendar, styles.single]),
          root: clsx([styles.calendar, styles.root])
        }}></Calendar>
      {/* <div className={styles.overlay}>Overlay</div> */}
    </Application.Overlay>
  )
}
