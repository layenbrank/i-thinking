import clsx from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/calendar/marker.module.scss'

type Props = Omit<MarkerProps, 'children'>

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

export default function Marker(props: Props) {
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

  const isCompact = props.size === 'mini' || props.size === 'small'

  return (
    <MagneticTile.Marker
      {...props}
      className={clsx([
        styles.marker,
        styles.island,
        props.size,
        props.direction,
        props.shape,
        isCompact ? styles.compact : styles.expanded
      ])}>
      {isCompact ? (
        <div className={styles.compactBody}>
          <span className={styles.month}>{now.format('M')}月</span>
          <span className={styles.day}>{now.format('D')}</span>
        </div>
      ) : (
        <div className={styles.expandedBody}>
          <span className={styles.weekday}>周{WEEK[now.day()]}</span>
          <span className={styles.bigDay}>{now.format('D')}</span>
          <span className={styles.ymd}>{now.format('YYYY年M月')}</span>
        </div>
      )}
    </MagneticTile.Marker>
  )
}
