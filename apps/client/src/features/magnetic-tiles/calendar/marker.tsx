import { calendar, timeSphere } from '@i-thinking/utils'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { findCapacity, isWide } from '@/features/magnetic-tile/marker-density'
import { markerClass } from '@/features/magnetic-tile/marker-class'
import styles from '@/features/magnetic-tiles/calendar/marker.module.scss'

type Props = Omit<MarkerProps, 'children'>

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

function Marker(props: Props) {
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 60_000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const capacity = findCapacity(props.size, props.shape, props.direction)
  const wide = isWide(props.shape, props.direction)
  const isCompact = capacity <= 1

  const lunarInfo = useMemo(
    function () {
      const key = timeSphere.format(now.toDate(), 'YYYY-MM-DD')
      const cycle = calendar.sixtyCycle(key)
      return {
        day: calendar.format(key, 'lD'),
        month: calendar.format(key, 'lM'),
        term: calendar.term(key),
        holiday: calendar.festival(key),
        ganZhi: `${cycle.heavenStem}${cycle.earthBranch}${cycle.zodiac}年`
      }
    },
    [now]
  )

  const showLunar = capacity >= 2
  const showTerm = capacity >= 3 && Boolean(lunarInfo.term || lunarInfo.holiday)
  const showGanZhi = capacity >= 5
  const showIso = capacity >= 6

  return (
    <MagneticTile.Marker
      {...props}
      className={markerClass(
        styles,
        props.size,
        props.shape,
        props.direction,
        isCompact ? styles.compact : styles.expanded,
        wide && styles.wide
      )}>
      {isCompact ? (
        <div className={styles.compactBody}>
          <span className={styles.month}>{now.format('M')}月</span>
          <span className={styles.day}>{now.format('D')}</span>
        </div>
      ) : (
        <div className={styles.expandedBody}>
          <div className={styles.head}>
            <span className={styles.weekday}>周{WEEK[now.day()]}</span>
            <span className={styles.ymd}>
              {capacity >= 3 ? now.format('YYYY年M月') : `${now.format('M')}月`}
            </span>
          </div>
          <span className={styles.bigDay}>{now.format('D')}</span>
          <div className={styles.meta}>
            {showLunar ? (
              <span className={styles.lunar}>
                农历{lunarInfo.month}月{lunarInfo.day}
              </span>
            ) : null}
            {showTerm ? (
              <span className={styles.term}>{lunarInfo.holiday || lunarInfo.term}</span>
            ) : null}
            {showGanZhi ? <span className={styles.ganzhi}>{lunarInfo.ganZhi}</span> : null}
            {showIso ? <span className={styles.iso}>{now.format('YYYY-MM-DD')}</span> : null}
          </div>
        </div>
      )}
    </MagneticTile.Marker>
  )
}

export default Marker
