import clsx from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { Application, type MarkerProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/clock/marker.module.scss'
import { useClockStore } from '@/stores/clock'

type Props = Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  const clockStyle = useClockStore(function (s) {
    return s.clockStyle
  })
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const isCompact = props.size === 'mini' || props.size === 'small'
  const timeText =
    clockStyle === 'minimal' || isCompact ? now.format('HH:mm') : now.format('HH:mm:ss')

  return (
    <Application.Marker
      {...props}
      className={clsx([
        styles.marker,
        styles.island,
        styles[clockStyle],
        props.size,
        props.direction,
        props.shape,
        isCompact ? styles.compact : styles.expanded
      ])}>
      <div className={styles.body}>
        {clockStyle === 'analog' ? (
          <div className={styles.analogFace}>
            <AnalogFace now={now} />
          </div>
        ) : (
          <span className={styles.time}>{timeText}</span>
        )}
        {!isCompact && clockStyle !== 'analog' ? (
          <span className={styles.date}>{now.format('M月D日 ddd')}</span>
        ) : null}
      </div>
    </Application.Marker>
  )
}

function AnalogFace(props: { now: dayjs.Dayjs }) {
  const h = props.now.hour() % 12
  const m = props.now.minute()
  const s = props.now.second()
  const hourDeg = h * 30 + m * 0.5
  const minuteDeg = m * 6
  const secondDeg = s * 6

  return (
    <>
      <span
        className={styles.handHour}
        style={{ transform: `rotate(${hourDeg}deg)` }}
      />
      <span
        className={styles.handMinute}
        style={{ transform: `rotate(${minuteDeg}deg)` }}
      />
      <span
        className={styles.handSecond}
        style={{ transform: `rotate(${secondDeg}deg)` }}
      />
      <span className={styles.analogCenter} />
    </>
  )
}
