import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { findCapacity, isWide } from '@/features/magnetic-tile/marker-density'
import { markerClass } from '@/features/magnetic-tile/marker-class'
import styles from '@/features/magnetic-tiles/clock/marker.module.scss'
import { useClockStore } from '@/stores/clock'

type Props = Omit<MarkerProps, 'children'>

function pad(n: number) {
  return String(n).padStart(2, '0')
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

function DigitalDigits(props: { h: string; m: string; s: string; showSeconds: boolean }) {
  return (
    <div className={styles.digital}>
      <span className={styles.digitGroup}>
        <span className={styles.digit}>{props.h[0]}</span>
        <span className={styles.digit}>{props.h[1]}</span>
      </span>
      <span className={styles.colon}>:</span>
      <span className={styles.digitGroup}>
        <span className={styles.digit}>{props.m[0]}</span>
        <span className={styles.digit}>{props.m[1]}</span>
      </span>
      {props.showSeconds ? (
        <>
          <span className={styles.colon}>:</span>
          <span className={styles.digitGroup}>
            <span className={styles.digit}>{props.s[0]}</span>
            <span className={styles.digit}>{props.s[1]}</span>
          </span>
        </>
      ) : null}
    </div>
  )
}

function FlipBlock(props: { text: string }) {
  return (
    <span className={styles.flipGroup}>
      {props.text.split('').map(function (ch, i) {
        return (
          <span
            key={`${i}-${ch}`}
            className={styles.flipCard}>
            {ch}
          </span>
        )
      })}
    </span>
  )
}

function Marker(props: Props) {
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

  const capacity = findCapacity(props.size, props.shape, props.direction)
  const wide = isWide(props.shape, props.direction)
  const showSeconds = capacity >= 2 && clockStyle !== 'minimal'
  const showAside = capacity >= 2
  const showPeriod = capacity >= 3
  const showFullDate = capacity >= 4
  const showWeek = capacity >= 5

  const h = pad(now.hour())
  const m = pad(now.minute())
  const s = pad(now.second())
  const period = now.hour() < 12 ? '上午' : '下午'
  const dateLabel = showFullDate
    ? now.format('YYYY年M月D日')
    : now.format('M月D日')
  const weekday = now.format('dddd')
  const weekOfYear = Math.max(
    1,
    Math.ceil((now.diff(now.startOf('year'), 'day') + now.startOf('year').day() + 1) / 7)
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
        wide && styles.wide
      )}>
      <div className={styles.body}>
        <div className={styles.stage}>
          {clockStyle === 'analog' ? (
            <div className={styles.analogFace}>
              <AnalogFace now={now} />
            </div>
          ) : null}

          {clockStyle === 'flip' ? (
            <div className={styles.flipRow}>
              <FlipBlock text={h} />
              <span className={styles.flipColon}>:</span>
              <FlipBlock text={m} />
              {showSeconds ? (
                <>
                  <span className={styles.flipColon}>:</span>
                  <FlipBlock text={s} />
                </>
              ) : null}
            </div>
          ) : null}

          {clockStyle === 'minimal' ? (
            <div className={styles.minimal}>
              <span className={styles.minimalTime}>
                {h}:{m}
              </span>
              {showSeconds ? <span className={styles.minimalSec}>{s}</span> : null}
            </div>
          ) : null}

          {clockStyle === 'digital' || clockStyle === 'neon' ? (
            <DigitalDigits
              h={h}
              m={m}
              s={s}
              showSeconds={showSeconds}
            />
          ) : null}
        </div>

        {showAside ? (
          <aside className={styles.aside}>
            {showPeriod ? <span className={styles.period}>{period}</span> : null}
            <span className={styles.date}>{dateLabel}</span>
            <span className={styles.weekday}>{weekday}</span>
            {showWeek ? <span className={styles.week}>第 {weekOfYear} 周</span> : null}
          </aside>
        ) : null}
      </div>
    </MagneticTile.Marker>
  )
}

export default Marker
