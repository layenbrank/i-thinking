import { Icon } from '@iconify/react'
import { invoke } from '@tauri-apps/api/core'
import { LogicalSize, getCurrentWindow } from '@tauri-apps/api/window'
import { App, Button, Checkbox, InputNumber, TimePicker, Tooltip } from 'antd'
import { clsx } from 'clsx'
import dayjs, { type Dayjs } from 'dayjs'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useClockStore, type CountdownUpdate } from '@/stores/clock'
import styles from '@/views/countdown/countdown.module.scss'

// ─── Dynamic window sizing constants ──────────────────────
const BASE_HEIGHT = 420
const SALARY_DELTA = 140
const SETTINGS_DELTA = 360
const WINDOW_WIDTH = 400

// ─── Types ─────────────────────────────────────────────────

type WorkStatus = 'before' | 'working' | 'after' | 'rest'

const WEEKDAY_OPTIONS = [
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
  { label: '日', value: 7 }
]

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

const STATUS_META: Record<WorkStatus, { label: string; icon: string; cls: string }> = {
  before: { label: '距上班', icon: 'mdi:briefcase-clock-outline', cls: styles.statusBefore },
  working: { label: '距下班', icon: 'mdi:briefcase-check-outline', cls: styles.statusWorking },
  after: { label: '今日已下班', icon: 'mdi:home-clock-outline', cls: styles.statusAfter },
  rest: { label: '今日休息', icon: 'mdi:beach', cls: styles.statusRest }
}

// ─── Main View ─────────────────────────────────────────────
const SCOPE = '[data-through="false"]'
const GLOBAL = 'div[class~="countdown-through"]'

export interface CountdownProps {
  /** When true, runs inside the shared overlay window (no OS window APIs). */
  embedded?: boolean
  onClose?: () => void
  onSizeChange?: (height: number) => void
}

export default function Countdown(props: CountdownProps = {}) {
  const { embedded = false, onClose, onSizeChange } = props
  const { message } = App.useApp()
  const { config, loaded, initialize, updateConfig } = useClockStore()

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [now, onUpdateTime] = useState(dayjs())
  const [visible, onUpdateVisible] = useState(false)

  // Local form state for settings panel
  const [localConfig, setLocalConfig] = useState({
    workStart: config.workStart,
    workEnd: config.workEnd,
    workDays: config.workDays,
    monthlySalary: config.monthlySalary,
    payDay: config.payDay
  })

  useEffect(
    function () {
      initialize()
    },
    [initialize]
  )

  // Sync local config when opening settings panel (avoids overwriting in-progress edits)
  useEffect(
    function () {
      if (visible && loaded) {
        setLocalConfig({
          workStart: config.workStart,
          workEnd: config.workEnd,
          workDays: config.workDays,
          monthlySalary: config.monthlySalary,
          payDay: config.payDay
        })
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [visible, loaded]
  )

  useEffect(function () {
    timerRef.current = setInterval(function () {
      onUpdateTime(dayjs())
    }, 1000)
    return function () {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const workDaysList = useMemo(
    function () {
      try {
        return JSON.parse(config.workDays) as number[]
      } catch {
        return [1, 2, 3, 4, 5]
      }
    },
    [config.workDays]
  )

  const computed = useMemo(
    function () {
      return compute(
        now,
        config.workStart,
        config.workEnd,
        workDaysList,
        config.monthlySalary,
        config.payDay
      )
    },
    [now, config.workStart, config.workEnd, config.monthlySalary, config.payDay, workDaysList]
  )

  const {
    status,
    countdown,
    progress,
    todayEarned,
    dailySalary,
    daysUntilPayday,
    isPayday,
    paydayDate
  } = computed
  const statusMeta = STATUS_META[status]

  // ─── Phase A: dynamic sizing (OS window or overlay panel) ─
  const showSalary = config.monthlySalary > 0 && (status === 'working' || status === 'after')
  useEffect(
    function () {
      const h = BASE_HEIGHT + (showSalary ? SALARY_DELTA : 0) + (visible ? SETTINGS_DELTA : 0)
      if (embedded) {
        onSizeChange?.(h)
        return
      }
      getCurrentWindow()
        .setSize(new LogicalSize(WINDOW_WIDTH, h))
        .catch(function () {
          /* non-tauri env */
        })
    },
    [embedded, onSizeChange, showSalary, visible]
  )

  // ─── Phase B4: register click-through rects (standalone window only)
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(
    function () {
      if (embedded) return
      const root = containerRef.current
      if (!root) return

      let frame = 0
      const observed = new WeakSet<HTMLElement>()

      function sync() {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(function () {
          if (!root) return
          const throughs = root.querySelectorAll<HTMLElement>(SCOPE)
          const throughg = document.querySelectorAll<HTMLElement>(GLOBAL)
          const nodes = Array.from(throughs).concat(Array.from(throughg))
          const rects = Array.from(nodes).map(function (el) {
            const r = el.getBoundingClientRect()
            return {
              x: Math.round(r.left),
              y: Math.round(r.top),
              w: Math.round(r.width),
              h: Math.round(r.height)
            }
          })
          invoke('update_through_rects', { source: 'countdown-standalone', rects }).catch(
            function () {
              /* non-tauri env */
            }
          )
        })
      }

      const ro = new ResizeObserver(sync)
      ro.observe(root)

      function observeAll() {
        const throughs = root?.querySelectorAll<HTMLElement>(SCOPE) ?? []
        const throughg = document.querySelectorAll<HTMLElement>(GLOBAL)
        Array.from(throughs)
          .concat(Array.from(throughg))
          .forEach(function (el) {
            if (observed.has(el)) return
            ro.observe(el)
            observed.add(el)
          })
      }
      observeAll()

      const mo = new MutationObserver(function () {
        observeAll()
        sync()
      })
      mo.observe(root, { childList: true, subtree: true })

      sync()
      return function () {
        cancelAnimationFrame(frame)
        ro.disconnect()
        mo.disconnect()
        invoke('update_through_rects', {
          source: 'countdown-standalone',
          rects: []
        }).catch(function () {})
      }
    },
    [embedded]
  )

  const handleSave = useCallback(
    async function () {
      const update: CountdownUpdate = {
        workStart: localConfig.workStart,
        workEnd: localConfig.workEnd,
        workDays: localConfig.workDays,
        monthlySalary: localConfig.monthlySalary,
        payDay: localConfig.payDay
      }
      try {
        await updateConfig(update)
        message.success('工作配置已保存')
        onUpdateVisible(false)
      } catch {
        message.error('保存失败，请稍后重试')
      }
    },
    [localConfig, updateConfig]
  )

  const localWorkDaysList = useMemo(
    function () {
      try {
        return JSON.parse(localConfig.workDays) as number[]
      } catch {
        return [1, 2, 3, 4, 5]
      }
    },
    [localConfig.workDays]
  )

  const startTimeValue = useMemo(
    function () {
      const [h, m] = parseTimeStr(localConfig.workStart)
      return dayjs().hour(h).minute(m).second(0)
    },
    [localConfig.workStart]
  )

  const endTimeValue = useMemo(
    function () {
      const [h, m] = parseTimeStr(localConfig.workEnd)
      return dayjs().hour(h).minute(m).second(0)
    },
    [localConfig.workEnd]
  )

  const dateLabel = now.format('YYYY年MM月DD日') + ' ' + WEEK_LABELS[now.day()]

  function handleRegion(e: React.MouseEvent) {
    if (embedded) return
    if (e.button === 0) getCurrentWindow().startDragging()
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}>
      {/* Header */}
      <div
        className={styles.header}
        data-through="false"
        data-region="true"
        onMouseDown={handleRegion}>
        <span className={styles.dateText}>{dateLabel}</span>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <Tooltip title="工作配置">
            <motion.button
              aria-label="工作配置"
              onMouseDown={function (e) {
                e.stopPropagation()
              }}
              className={clsx(styles.iconBtn, { [styles.iconBtnActive]: visible })}
              whileTap={{ scale: 0.9 }}
              onClick={function () {
                onUpdateVisible(function (o) {
                  return !o
                })
              }}>
              <Icon
                icon="mdi:cog-outline"
                width={17}
                height={17}
              />
            </motion.button>
          </Tooltip>
          {embedded && onClose ? (
            <Tooltip title="关闭">
              <motion.button
                aria-label="关闭"
                onMouseDown={function (e) {
                  e.stopPropagation()
                }}
                className={styles.iconBtn}
                whileTap={{ scale: 0.9 }}
                onClick={onClose}>
                <Icon
                  icon="mdi:close"
                  width={17}
                  height={17}
                />
              </motion.button>
            </Tooltip>
          ) : null}
        </div>
      </div>

      {/* Work status card */}
      <div
        className={styles.card}
        data-through="false"
        onMouseDown={handleRegion}>
        <div className={clsx(styles.statusBadge, statusMeta.cls)}>
          <Icon
            icon={statusMeta.icon}
            width={14}
            height={14}
          />
          <span>{statusMeta.label}</span>
        </div>

        <AnimatePresence
          mode="wait"
          initial={false}>
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}>
            {status === 'before' || status === 'working' ? (
              <div className={styles.timerDisplay}>{countdown}</div>
            ) : (
              <div className={clsx(styles.timerDisplay, styles.timerDim)}>
                {status === 'after' ? '已下班 🎉' : '休息日 ☀️'}
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Progress bar — only while working */}
        <AnimatePresence>
          {status === 'working' && (
            <motion.div
              className={styles.progressTrack}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}>
              <motion.div
                className={styles.progressFill}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <span className={styles.progressLabel}>{progress.toFixed(1)}%</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Salary card — only when working and salary configured */}
      <AnimatePresence>
        {config.monthlySalary > 0 && (status === 'working' || status === 'after') && (
          <motion.div
            onMouseDown={handleRegion}
            data-through="false"
            className={styles.card}
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}>
            <div className={styles.cardLabel}>
              <Icon
                icon="mdi:cash-clock"
                width={14}
                height={14}
              />
              <span>今日实时薪酬</span>
            </div>
            <SalaryDisplay amount={todayEarned} />
            <div className={styles.salarySubtext}>
              月薪 ¥{config.monthlySalary.toLocaleString()} · 日薪 ¥{dailySalary.toFixed(2)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payday countdown card */}
      <div
        className={clsx(styles.card, styles.paydayCard)}
        data-through="false"
        onMouseDown={handleRegion}>
        <div className={styles.cardLabel}>
          <Icon
            icon="mdi:calendar-star"
            width={14}
            height={14}
          />
          <span>发薪日</span>
        </div>
        {isPayday ? (
          <div className={styles.paydayToday}>🎉 今天发薪日！</div>
        ) : (
          <>
            <div className={styles.paydayDays}>
              {daysUntilPayday}
              <span className={styles.paydayUnit}>天</span>
            </div>
            <div className={styles.paydayDate}>{paydayDate} 发薪</div>
          </>
        )}
      </div>

      {/* Settings panel */}
      <AnimatePresence>
        {visible && (
          <motion.div
            className={clsx(styles.card, styles.settingsCard)}
            data-through="false"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            <div className={styles.settingsTitle}>
              <Icon
                icon="mdi:cog-outline"
                width={14}
                height={14}
              />
              <span>工作配置</span>
            </div>

            <div className={styles.settingsGrid}>
              <div className={styles.fieldRow}>
                <label>上班时间</label>
                <TimePicker
                  classNames={{
                    popup: 'countdown-through'
                  }}
                  format="HH:mm"
                  size="small"
                  allowClear={false}
                  value={startTimeValue}
                  onChange={function (v: Dayjs | null) {
                    if (v)
                      setLocalConfig(function (c) {
                        return { ...c, workStart: v.format('HH:mm') }
                      })
                  }}
                />
              </div>

              <div className={styles.fieldRow}>
                <label>下班时间</label>
                <TimePicker
                  classNames={{
                    popup: 'countdown-through'
                  }}
                  format="HH:mm"
                  data-type="测试"
                  size="small"
                  allowClear={false}
                  value={endTimeValue}
                  onChange={function (v: Dayjs | null) {
                    if (v)
                      setLocalConfig(function (c) {
                        return { ...c, workEnd: v.format('HH:mm') }
                      })
                  }}
                />
              </div>

              <div className={styles.fieldRow}>
                <label>工作日</label>
                <Checkbox.Group
                  options={WEEKDAY_OPTIONS}
                  value={localWorkDaysList}
                  onChange={function (vals) {
                    setLocalConfig(function (c) {
                      return { ...c, workDays: JSON.stringify(vals) }
                    })
                  }}
                />
              </div>

              <div className={styles.fieldRow}>
                <label>月薪（元）</label>
                <InputNumber
                  size="small"
                  min={0}
                  step={100}
                  precision={2}
                  placeholder="0.00"
                  value={localConfig.monthlySalary || undefined}
                  style={{ width: 120 }}
                  onChange={function (v) {
                    setLocalConfig(function (c) {
                      return { ...c, monthlySalary: v ?? 0 }
                    })
                  }}
                />
              </div>

              <div className={styles.fieldRow}>
                <label>发薪日</label>
                <InputNumber
                  size="small"
                  min={1}
                  max={31}
                  precision={0}
                  addonAfter="日"
                  value={localConfig.payDay}
                  style={{ width: 100 }}
                  onChange={function (v) {
                    setLocalConfig(function (c) {
                      return { ...c, payDay: v ?? 15 }
                    })
                  }}
                />
              </div>
            </div>

            <div className={styles.settingsActions}>
              <Button
                size="small"
                onClick={function () {
                  onUpdateVisible(false)
                }}>
                取消
              </Button>
              <Button
                type="primary"
                size="small"
                icon={
                  <Icon
                    icon="mdi:content-save-outline"
                    width={14}
                    height={14}
                  />
                }
                onClick={handleSave}>
                保存
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Helpers ───────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

function parseTimeStr(timeStr: string): [number, number] {
  const parts = timeStr.split(':').map(Number)
  return [parts[0] ?? 9, parts[1] ?? 0]
}

function buildTimeOnDate(base: Dayjs, timeStr: string): Dayjs {
  const [h, m] = parseTimeStr(timeStr)
  return base.startOf('day').hour(h).minute(m).second(0).millisecond(0)
}

function formatDuration(totalSeconds: number): string {
  const secs = Math.max(0, Math.floor(totalSeconds))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

function getWorkingDaysInMonth(year: number, month: number, workDays: number[]): number {
  const daysInMonth = dayjs(new Date(year, month, 1)).daysInMonth()
  let count = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = dayjs(new Date(year, month, d)).day() // 0=Sun
    const iso = dow === 0 ? 7 : dow
    if (workDays.includes(iso)) count++
  }
  return Math.max(1, count)
}

function getDayOfWeekISO(d: Dayjs): number {
  const dow = d.day() // 0=Sun
  return dow === 0 ? 7 : dow
}

/** Clamp a day-of-month so it does not overflow into the next month (e.g. Feb 31 → Feb 28). */
function clampDayToMonth(base: Dayjs, day: number): Dayjs {
  return base.date(Math.min(day, base.daysInMonth()))
}

interface Computed {
  status: WorkStatus
  countdown: string
  progress: number // 0–100
  elapsedSeconds: number
  totalWorkSeconds: number
  todayEarned: number
  dailySalary: number
  daysUntilPayday: number
  isPayday: boolean
  paydayDate: string
}

function compute(
  now: Dayjs,
  workStart: string,
  workEnd: string,
  workDays: number[],
  monthlySalary: number,
  payDay: number
): Computed {
  const isoDay = getDayOfWeekISO(now)
  const isWorkDay = workDays.includes(isoDay)

  const startTime = buildTimeOnDate(now, workStart)
  const endTime = buildTimeOnDate(now, workEnd)
  const totalWorkSeconds = Math.max(1, endTime.diff(startTime, 'second'))

  let status: WorkStatus
  let countdown = '00:00:00'
  let progress = 0
  let elapsedSeconds = 0

  if (!isWorkDay) {
    status = 'rest'
  } else if (now.isBefore(startTime)) {
    status = 'before'
    countdown = formatDuration(startTime.diff(now, 'second'))
  } else if (now.isBefore(endTime) || now.isSame(endTime)) {
    status = 'working'
    elapsedSeconds = now.diff(startTime, 'second')
    const remaining = endTime.diff(now, 'second')
    countdown = formatDuration(remaining)
    progress = Math.min(100, (elapsedSeconds / totalWorkSeconds) * 100)
  } else {
    status = 'after'
    progress = 100
    elapsedSeconds = totalWorkSeconds
  }

  // Salary
  let todayEarned = 0
  const workingDays = getWorkingDaysInMonth(now.year(), now.month(), workDays)
  const dailySalary = monthlySalary > 0 ? monthlySalary / workingDays : 0
  if (monthlySalary > 0 && (status === 'working' || status === 'after') && isWorkDay) {
    todayEarned = (Math.min(elapsedSeconds, totalWorkSeconds) / totalWorkSeconds) * dailySalary
  }

  // Payday
  const today = now.date()
  let daysUntilPayday = 0
  let isPayday = false
  let paydayDate = ''

  const clampedThisMonth = clampDayToMonth(now, payDay)
  const effectivePayDayThisMonth = clampedThisMonth.date()

  if (today === effectivePayDayThisMonth) {
    isPayday = true
    paydayDate = clampedThisMonth.format('MM月DD日')
  } else if (today < effectivePayDayThisMonth) {
    daysUntilPayday = clampedThisMonth.diff(now.startOf('day'), 'day')
    paydayDate = clampedThisMonth.format('MM月DD日')
  } else {
    const target = clampDayToMonth(now.add(1, 'month'), payDay)
    daysUntilPayday = target.diff(now.startOf('day'), 'day')
    paydayDate = target.format('MM月DD日')
  }

  return {
    status,
    countdown,
    progress,
    elapsedSeconds,
    totalWorkSeconds,
    todayEarned,
    dailySalary,
    daysUntilPayday,
    isPayday,
    paydayDate
  }
}

// ─── Salary display ────────────────────────────────────────

function SalaryDisplay({ amount }: { amount: number }) {
  const str = amount.toFixed(4)
  const [intPart, decPart] = str.split('.')
  return (
    <div className={styles.salaryAmount}>
      <span className={styles.salaryCurrency}>¥</span>
      <span className={styles.salaryInt}>{intPart}</span>
      <span className={styles.salarySep}>.</span>
      <span className={styles.salaryDec}>{decPart}</span>
    </div>
  )
}
