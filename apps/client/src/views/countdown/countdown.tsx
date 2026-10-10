import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'
import {
  computeCountdown,
  parseWorkDays,
  STATUS_LABELS,
  type WorkStatus
} from '@/features/magnetic-tiles/countdown/compute'
import { useClockStore } from '@/stores/clock'
import styles from '@/views/countdown/countdown.module.scss'

const WEEKDAY_OPTIONS = [
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
  { label: '日', value: 7 }
]

const STATUS_ICON: Record<WorkStatus, string> = {
  before: 'mdi:briefcase-clock-outline',
  working: 'mdi:briefcase-check-outline',
  after: 'mdi:home-clock-outline',
  rest: 'mdi:beach'
}

function closeWindow() {
  void getCurrentWindow().close()
}

function Countdown() {
  const { config, loaded, initialize, updateConfig } = useClockStore()
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })
  const [saving, onUpdateSaving] = useState(false)

  const [localConfig, onUpdateLocal] = useState({
    workStart: config.workStart,
    workEnd: config.workEnd,
    workDays: config.workDays,
    monthlySalary: config.monthlySalary,
    payDay: config.payDay
  })

  useEffect(
    function () {
      void initialize()
    },
    [initialize]
  )

  useEffect(
    function () {
      if (!loaded) return
      onUpdateLocal({
        workStart: config.workStart,
        workEnd: config.workEnd,
        workDays: config.workDays,
        monthlySalary: config.monthlySalary,
        payDay: config.payDay
      })
    },
    [loaded, config]
  )

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const localWorkDays = useMemo(
    function () {
      return parseWorkDays(localConfig.workDays)
    },
    [localConfig.workDays]
  )

  const localShift = useMemo(
    function () {
      return computeCountdown(
        now,
        localConfig.workStart,
        localConfig.workEnd,
        localWorkDays,
        localConfig.monthlySalary,
        localConfig.payDay
      )
    },
    [now, localConfig, localWorkDays]
  )

  async function handleSave() {
    if (!localShift.isValidShift) {
      toast.error('下班时间必须晚于上班时间')
      return
    }
    onUpdateSaving(true)
    try {
      await updateConfig(localConfig)
      toast.success('已保存')
      closeWindow()
    } catch {
      toast.error('保存失败')
    } finally {
      onUpdateSaving(false)
    }
  }

  const live = localShift
  const progressPct = Math.round(Math.max(live.progress, live.status === 'after' ? 100 : 0))
  const footerStatus =
    live.status === 'working'
      ? '工作中'
      : live.status === 'before'
        ? '未开始'
        : STATUS_LABELS[live.status]
  const workRange = `${localConfig.workStart} – ${localConfig.workEnd}`
  const paydayText = live.isPayday
    ? '今天发薪'
    : live.paydayDate
      ? `${live.daysUntilPayday} 天后`
      : '—'

  function toggleWorkDay(day: number) {
    const next = localWorkDays.includes(day)
      ? localWorkDays.filter(function (d) {
          return d !== day
        })
      : [...localWorkDays, day].sort(function (a, b) {
          return a - b
        })
    onUpdateLocal(function (c) {
      return { ...c, workDays: JSON.stringify(next) }
    })
  }

  return (
    <WindowFrame
      title={findComponentLabel('countdown')}
      isScrollable={false}
      footer={
        <>
          <Button onClick={closeWindow}>取消</Button>
          <Button
            disabled={saving}
            onClick={function () {
              void handleSave()
            }}>
            保存
          </Button>
        </>
      }>
      <div className={styles.stage}>
        <div className={clsx(styles.preview, styles[live.status])}>
          <div className={styles.previewHero}>
            {localConfig.monthlySalary > 0 ? (
              <div className={styles.previewMetric}>
                <span className={styles.previewLabel}>今日已赚</span>
                <span className={styles.previewEarn}>¥{live.todayEarned.toFixed(2)}</span>
              </div>
            ) : null}
            <div className={styles.previewMetric}>
              <span className={styles.previewLabel}>{STATUS_LABELS[live.status]}</span>
              <span className={styles.previewTime}>{live.countdown}</span>
            </div>
          </div>

          <div className={styles.previewFacts}>
            <div className={styles.fact}>
              <span className={styles.factLabel}>班次</span>
              <span className={styles.factValue}>{workRange}</span>
            </div>
            {localConfig.monthlySalary > 0 ? (
              <>
                <div className={styles.fact}>
                  <span className={styles.factLabel}>日薪</span>
                  <span className={styles.factValue}>¥{live.dailySalary.toFixed(2)}</span>
                </div>
                <div className={styles.fact}>
                  <span className={styles.factLabel}>距发薪</span>
                  <span className={styles.factValue}>{paydayText}</span>
                </div>
              </>
            ) : (
              <div className={styles.fact}>
                <span className={styles.factLabel}>状态</span>
                <span className={styles.factValue}>{footerStatus}</span>
              </div>
            )}
          </div>

          <div className={styles.previewTrackWrap}>
            <div className={styles.previewTrackHead}>
              <span>班次进度</span>
              <span>{progressPct}%</span>
            </div>
            <div className={styles.previewTrack}>
              <div
                className={styles.previewFill}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className={styles.previewBottom}>
            <span className={styles.previewStatus}>
              <Icon
                icon={STATUS_ICON[live.status]}
                width={14}
                height={14}
              />
              {footerStatus}
            </span>
            <span className={styles.previewRange}>{now.format('M月D日 ddd')}</span>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.form}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>班次</h3>
              {!localShift.isValidShift ? (
                <p className={styles.warn}>下班时间须晚于上班时间</p>
              ) : null}
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>上班</span>
                  <Input
                    type="time"
                    value={localConfig.workStart}
                    aria-invalid={!localShift.isValidShift || undefined}
                    onChange={function (event) {
                      const value = event.target.value
                      if (!value) return
                      onUpdateLocal(function (c) {
                        return { ...c, workStart: value }
                      })
                    }}
                  />
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>下班</span>
                  <Input
                    type="time"
                    value={localConfig.workEnd}
                    aria-invalid={!localShift.isValidShift || undefined}
                    onChange={function (event) {
                      const value = event.target.value
                      if (!value) return
                      onUpdateLocal(function (c) {
                        return { ...c, workEnd: value }
                      })
                    }}
                  />
                </label>
              </div>
              <div className={styles.dayBlock}>
                <span className={styles.dayLabel}>工作日</span>
                <div
                  className={styles.dayChips}
                  role="group"
                  aria-label="工作日">
                  {WEEKDAY_OPTIONS.map(function (opt) {
                    const isOn = localWorkDays.includes(opt.value)
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        className={clsx(styles.dayChip, isOn && styles.dayChipOn)}
                        aria-pressed={isOn}
                        onClick={function () {
                          toggleWorkDay(opt.value)
                        }}>
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>薪酬</h3>
              <div className={styles.grid}>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>月薪</span>
                  <div className="flex items-center gap-1">
                    <span className="shrink-0 text-xs text-muted-foreground">¥</span>
                    <Input
                      type="number"
                      min={0}
                      step={100}
                      value={localConfig.monthlySalary || ''}
                      onChange={function (event) {
                        const value = Number(event.target.value)
                        onUpdateLocal(function (c) {
                          return { ...c, monthlySalary: Number.isFinite(value) ? value : 0 }
                        })
                      }}
                    />
                  </div>
                </label>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>发薪日</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      step={1}
                      value={localConfig.payDay}
                      onChange={function (event) {
                        const value = Number(event.target.value)
                        onUpdateLocal(function (c) {
                          return {
                            ...c,
                            payDay: Number.isFinite(value) && value > 0 ? value : 1
                          }
                        })
                      }}
                    />
                    <span className="shrink-0 text-xs text-muted-foreground">日</span>
                  </div>
                </label>
              </div>
              <p className={styles.hint}>
                {localConfig.monthlySalary > 0
                  ? `按当前班次估算日薪约 ¥${live.dailySalary.toFixed(2)}，${paydayText}`
                  : '填写月薪后，磁贴将显示今日已赚与发薪倒计时'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </WindowFrame>
  )
}

export default Countdown
