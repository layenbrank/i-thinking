import { Icon } from '@iconify/react/offline'
import clsx from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import { findCapacity, isWide, markerClass } from '@/features/magnetic-tile/marker'
import {
  computeCountdown,
  parseWorkDays,
  STATUS_LABELS,
  type WorkStatus
} from '@/features/magnetic-tiles/countdown/compute'
import styles from '@/features/magnetic-tiles/countdown/marker.module.scss'
import { useClockStore } from '@/stores/clock'

type Props = Omit<MarkerProps, 'children'>

const STATUS_ICON: Record<WorkStatus, string> = {
  before: 'mdi:briefcase-clock-outline',
  working: 'mdi:briefcase-check-outline',
  after: 'mdi:home-clock-outline',
  rest: 'mdi:beach'
}

const METRIC_ICON = {
  earn: 'mdi:cash-multiple',
  countdown: 'mdi:timer-outline',
  payday: 'mdi:calendar-star',
  status: 'mdi:checkbox-marked-circle-outline',
  progress: 'mdi:chart-timeline-variant',
  shift: 'mdi:clock-outline',
  decor: 'mdi:briefcase-clock-outline'
} as const

function Marker(props: Props) {
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
          todayEarned: 0,
          dailySalary: 0,
          daysUntilPayday: 0,
          isPayday: false,
          paydayDate: ''
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

  const capacity = findCapacity(props.size, props.shape, props.direction)
  const wide = isWide(props.shape, props.direction)
  const statusLabel = STATUS_LABELS[computed.status]
  const workRange = `${config.workStart} – ${config.workEnd}`
  const hasSalary = config.monthlySalary > 0

  /** size1 高度仅 ~60px，capacity+1 仍强制紧凑，避免展开布局叠字 */
  const isCompact = props.size <= 1
  const showEarn = !isCompact && capacity >= 2 && hasSalary
  const showTrack = !isCompact && capacity >= 2
  const showFooter = !isCompact && capacity >= 2
  /** size2 横矩形 capacity=3 仅 ~150px 高：经典四行 KPI，发薪面板 ≥4 */
  const showPayday = !isCompact && capacity >= 4
  const showSalaryDetail = !isCompact && capacity >= 5 && hasSalary
  const showDate = !isCompact && capacity >= 6
  const showDecor = !isCompact && (wide ? props.size >= 2 : props.size >= 3)
  const progressPct = Math.round(
    Math.max(computed.progress, computed.status === 'after' ? 100 : 0)
  )

  const stripText =
    computed.status === 'working' || computed.status === 'before'
      ? computed.countdown
      : statusLabel

  /** 右列：避免下班/休息态标签与主值、底栏三重重复 */
  let metricLabel = statusLabel
  let metricValue = computed.countdown
  let metricIcon: (typeof METRIC_ICON)[keyof typeof METRIC_ICON] = METRIC_ICON.countdown
  let isMetricDim = false
  if (computed.status === 'after' || computed.status === 'rest') {
    if (hasSalary && !showPayday) {
      metricLabel = computed.isPayday ? '发薪日' : '距发薪'
      metricValue = computed.isPayday ? '今天' : `${computed.daysUntilPayday}天`
      metricIcon = METRIC_ICON.payday
    } else {
      metricLabel = '状态'
      metricValue = computed.status === 'after' ? '已完成' : '休息中'
      metricIcon = METRIC_ICON.status
      isMetricDim = true
    }
  } else if (computed.status === 'before') {
    metricLabel = statusLabel
    metricValue = computed.countdown
    metricIcon = METRIC_ICON.countdown
  }

  const footerStatus =
    computed.status === 'working'
      ? '工作中'
      : computed.status === 'before'
        ? '未开始'
        : statusLabel

  const progressTitle =
    computed.status === 'after' ? '班次' : computed.status === 'rest' ? '本日' : '进度'

  return (
    <MagneticTile.Marker
      {...props}
      className={markerClass(
        styles,
        props.size,
        props.shape,
        props.direction,
        isCompact ? styles.compact : styles.expanded,
        wide && styles.wide,
        styles[computed.status]
      )}>
      {isCompact ? (
        wide ? (
          <div className={styles.stripBody}>
            <span className={clsx(styles.iconWell, styles.iconWellSm, styles.iconWellPrimary)}>
              <Icon
                icon={STATUS_ICON[computed.status]}
                width="1em"
                height="1em"
              />
            </span>
            <span className={styles.stripTime}>{stripText}</span>
            <div className={styles.stripTrack}>
              <div
                className={styles.stripFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className={styles.stripPct}>{progressPct}%</span>
          </div>
        ) : (
          <div className={styles.compactBody}>
            <span className={clsx(styles.iconWell, styles.iconWellPrimary)}>
              <Icon
                icon={STATUS_ICON[computed.status]}
                className={styles.compactIcon}
                width="1em"
                height="1em"
              />
            </span>
            <span className={styles.compactTime}>{stripText}</span>
            <div className={styles.compactTrack}>
              <div
                className={styles.compactFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )
      ) : (
        <div className={styles.expandedBody}>
          {showDecor ? (
            <div
              className={styles.decor}
              aria-hidden>
              <Icon
                icon={METRIC_ICON.decor}
                width="1em"
                height="1em"
              />
            </div>
          ) : null}

          <div className={styles.row}>
            {showEarn ? (
              <div className={clsx(styles.col, styles.earn)}>
                <div className={styles.metricHead}>
                  <span className={clsx(styles.iconWell, styles.iconWellSuccess)}>
                    <Icon
                      icon={METRIC_ICON.earn}
                      width="1em"
                      height="1em"
                    />
                  </span>
                  <span className={styles.label}>今日已赚</span>
                </div>
                <span className={styles.value}>¥{computed.todayEarned.toFixed(2)}</span>
              </div>
            ) : null}
            <div className={styles.col}>
              <div className={styles.metricHead}>
                <span className={clsx(styles.iconWell, styles.iconWellPrimary)}>
                  <Icon
                    icon={metricIcon}
                    width="1em"
                    height="1em"
                  />
                </span>
                <span className={styles.label}>{metricLabel}</span>
              </div>
              <span className={clsx(styles.value, isMetricDim && styles.valueDim)}>
                {metricValue}
              </span>
            </div>
          </div>

          {showTrack ? (
            <div className={styles.progress}>
              <div className={styles.progressHead}>
                <span className={styles.progressTitle}>
                  <Icon
                    icon={METRIC_ICON.progress}
                    className={styles.inlineIcon}
                    width="1em"
                    height="1em"
                  />
                  {progressTitle}
                </span>
                <span className={styles.progressLabel}>{progressPct}%</span>
              </div>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : null}

          {showFooter ? (
            <div className={styles.footer}>
              <span className={styles.status}>
                <span className={clsx(styles.iconWell, styles.iconWellSm, styles.iconWellStatus)}>
                  <Icon
                    icon={STATUS_ICON[computed.status]}
                    width="1em"
                    height="1em"
                  />
                </span>
                {footerStatus}
              </span>
              <span className={styles.range}>
                <Icon
                  icon={METRIC_ICON.shift}
                  className={styles.inlineIcon}
                  width="1em"
                  height="1em"
                />
                {workRange}
              </span>
            </div>
          ) : null}

          {showPayday || showSalaryDetail || showDate ? (
            <div className={styles.panels}>
              {showPayday ? (
                <div className={styles.panel}>
                  <span className={styles.panelLabel}>
                    <Icon
                      icon="mdi:calendar-star"
                      width="1em"
                      height="1em"
                    />
                    发薪日
                  </span>
                  {computed.isPayday ? (
                    <span className={styles.panelHero}>今天发薪</span>
                  ) : (
                    <>
                      <span className={styles.panelHero}>
                        {computed.daysUntilPayday}
                        <span className={styles.panelUnit}>天</span>
                      </span>
                      <span className={styles.panelSub}>{computed.paydayDate} 发薪</span>
                    </>
                  )}
                </div>
              ) : null}

              {showSalaryDetail ? (
                <div className={styles.panel}>
                  <span className={styles.panelLabel}>
                    <Icon
                      icon="mdi:cash-clock"
                      width="1em"
                      height="1em"
                    />
                    薪酬
                  </span>
                  <span className={styles.panelHero}>¥{computed.todayEarned.toFixed(2)}</span>
                  <span className={styles.panelSub}>
                    月薪 ¥{config.monthlySalary.toLocaleString()} · 日薪 ¥
                    {computed.dailySalary.toFixed(2)}
                  </span>
                </div>
              ) : null}

              {showDate ? (
                <div className={styles.panel}>
                  <span className={styles.panelLabel}>
                    <Icon
                      icon="mdi:calendar-outline"
                      width="1em"
                      height="1em"
                    />
                    今日
                  </span>
                  <span className={styles.panelHero}>{now.format('M月D日')}</span>
                  <span className={styles.panelSub}>{now.format('dddd')}</span>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </MagneticTile.Marker>
  )
}

export default Marker
