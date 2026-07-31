import { Icon } from '@iconify/react/offline'
import { App, Button, Form, InputNumber, Space, TimePicker } from 'antd'
import { clsx } from 'clsx'
import dayjs, { type Dayjs } from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  computeCountdown,
  parseClockTime,
  parseWorkDays,
  STATUS_LABELS,
  type WorkStatus
} from '@/features/magnetic-tiles/countdown/compute'
import styles from '@/features/magnetic-tiles/countdown/overlay.module.scss'
import { useClockStore } from '@/stores/clock'

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

function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)
  const { message } = App.useApp()
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

  const startTimeValue = useMemo(
    function () {
      const [h, m] = parseClockTime(localConfig.workStart)
      return dayjs().hour(h).minute(m).second(0)
    },
    [localConfig.workStart]
  )

  const endTimeValue = useMemo(
    function () {
      const [h, m] = parseClockTime(localConfig.workEnd)
      return dayjs().hour(h).minute(m).second(0)
    },
    [localConfig.workEnd]
  )

  async function handleSave() {
    if (!localShift.isValidShift) {
      message.error('下班时间必须晚于上班时间')
      return
    }
    onUpdateSaving(true)
    try {
      await updateConfig(localConfig)
      message.success('已保存')
      onUpdateVisible(false)
    } catch {
      message.error('保存失败')
    } finally {
      onUpdateSaving(false)
    }
  }

  const live = localShift
  const progressPct = Math.round(
    Math.max(live.progress, live.status === 'after' ? 100 : 0)
  )
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
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      caption={true}
      className={styles.root}
      onCancel={function () {
        onUpdateVisible(false)
      }}
      controls={
        <>
          <Button
            onClick={function () {
              onUpdateVisible(false)
            }}>
            取消
          </Button>
          <Button
            type="primary"
            loading={saving}
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
          <Form
            layout="vertical"
            className={styles.form}
            requiredMark={false}
            size="middle">
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>班次</h3>
              {!localShift.isValidShift ? (
                <p className={styles.warn}>下班时间须晚于上班时间</p>
              ) : null}
              <div className={styles.grid}>
                <Form.Item
                  label="上班"
                  className={styles.field}>
                  <TimePicker
                    format="HH:mm"
                    allowClear={false}
                    status={localShift.isValidShift ? undefined : 'error'}
                    value={startTimeValue}
                    className={styles.control}
                    onChange={function (v: Dayjs | null) {
                      if (!v) return
                      onUpdateLocal(function (c) {
                        return { ...c, workStart: v.format('HH:mm') }
                      })
                    }}
                  />
                </Form.Item>
                <Form.Item
                  label="下班"
                  className={styles.field}>
                  <TimePicker
                    format="HH:mm"
                    allowClear={false}
                    status={localShift.isValidShift ? undefined : 'error'}
                    value={endTimeValue}
                    className={styles.control}
                    onChange={function (v: Dayjs | null) {
                      if (!v) return
                      onUpdateLocal(function (c) {
                        return { ...c, workEnd: v.format('HH:mm') }
                      })
                    }}
                  />
                </Form.Item>
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
                <Form.Item
                  label="月薪"
                  className={styles.field}>
                  <InputNumber
                    min={0}
                    step={100}
                    precision={2}
                    prefix="¥"
                    value={localConfig.monthlySalary || undefined}
                    className={styles.control}
                    onChange={function (v) {
                      onUpdateLocal(function (c) {
                        return { ...c, monthlySalary: v ?? 0 }
                      })
                    }}
                  />
                </Form.Item>
                <Form.Item
                  label="发薪日"
                  className={styles.field}>
                  <Space.Compact className={styles.control}>
                    <InputNumber
                      min={1}
                      max={31}
                      precision={0}
                      value={localConfig.payDay}
                      style={{ width: '100%' }}
                      onChange={function (v) {
                        onUpdateLocal(function (c) {
                          return { ...c, payDay: v ?? 15 }
                        })
                      }}
                    />
                    <Button disabled>日</Button>
                  </Space.Compact>
                </Form.Item>
              </div>
              <p className={styles.hint}>
                {localConfig.monthlySalary > 0
                  ? `按当前班次估算日薪约 ¥${live.dailySalary.toFixed(2)}，${paydayText}`
                  : '填写月薪后，磁贴将显示今日已赚与发薪倒计时'}
              </p>
            </div>
          </Form>
        </div>
      </div>
    </MagneticTile.Overlay>
  )
}

export default Overlay
