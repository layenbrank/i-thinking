import { Icon } from '@iconify/react'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  computeCountdown,
  parseWorkDays,
  STATUS_LABELS
} from '@/features/magnetic-tiles/countdown/compute'
import styles from '@/features/magnetic-tiles/countdown/marker.module.scss'
import { useClockStore } from '@/stores/clock'

type Props = Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  const { config, loaded, initialize } = useClockStore()
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

  useEffect(
    function () {
      void initialize()
    },
    [initialize]
  )

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const workDays = useMemo(
    function () {
      return parseWorkDays(config.workDays)
    },
    [config.workDays]
  )

  const computed = useMemo(
    function () {
      if (!loaded) {
        return {
          status: 'working' as const,
          countdown: '--:--:--',
          progress: 0,
          todayEarned: 0
        }
      }
      return computeCountdown(
        now,
        config.workStart,
        config.workEnd,
        workDays,
        config.monthlySalary,
        config.payDay
      )
    },
    [now, loaded, config.workStart, config.workEnd, config.monthlySalary, config.payDay, workDays]
  )

  const isCompact = props.size === 1
  const statusLabel = STATUS_LABELS[computed.status]
  const earned = computed.todayEarned.toFixed(2)
  const workRange = `${config.workStart} – ${config.workEnd}`

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
          <Icon
            icon="mdi:timer-sand"
            className={styles.compactIcon}
            width={14}
            height={14}
          />
          <span className={styles.compactTime}>{computed.countdown}</span>
          <div className={styles.compactTrack}>
            <div
              className={styles.compactFill}
              style={{ width: `${computed.progress}%` }}
            />
          </div>
        </div>
      ) : (
        <div className={styles.expandedBody}>
          <div className={styles.row}>
            <div className={styles.col}>
              <span className={styles.labelEarn}>今日已赚</span>
              <span className={styles.valueEarn}>¥ {earned}</span>
            </div>
            <div className={styles.col}>
              <span className={styles.labelCount}>{statusLabel}</span>
              <span className={styles.valueCount}>{computed.countdown}</span>
            </div>
          </div>
          <div className={styles.track}>
            <div
              className={styles.fill}
              style={{ width: `${computed.progress}%` }}
            />
          </div>
          <div className={styles.footer}>
            <span className={styles.status}>
              <span className={styles.dot} />
              {computed.status === 'working' ? '工作中' : statusLabel}
            </span>
            <span className={styles.range}>{workRange}</span>
          </div>
        </div>
      )}
    </MagneticTile.Marker>
  )
}
