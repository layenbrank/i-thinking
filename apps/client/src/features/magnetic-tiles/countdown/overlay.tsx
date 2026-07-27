import { Icon } from '@iconify/react'
import { App, Button, Checkbox, InputNumber, Space, TimePicker } from 'antd'
import { clsx } from 'clsx'
import dayjs, { type Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  computeCountdown,
  parseClockTime,
  parseWorkDays,
  STATUS_LABELS
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

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)
  const { message } = App.useApp()
  const { config, loaded, initialize, updateConfig } = useClockStore()
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

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
      if (!visible || !loaded) return
      onUpdateLocal({
        workStart: config.workStart,
        workEnd: config.workEnd,
        workDays: config.workDays,
        monthlySalary: config.monthlySalary,
        payDay: config.payDay
      })
    },
    [visible, loaded, config]
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

  const localWorkDays = useMemo(
    function () {
      return parseWorkDays(localConfig.workDays)
    },
    [localConfig.workDays]
  )

  const computed = useMemo(
    function () {
      return computeCountdown(
        now,
        config.workStart,
        config.workEnd,
        workDays,
        config.monthlySalary,
        config.payDay
      )
    },
    [now, config, workDays]
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
    try {
      await updateConfig(localConfig)
      message.success('已保存工作配置')
      onUpdateVisible(false)
    } catch {
      message.error('保存失败')
    }
  }

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx([styles.overlay, styles.root])}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.body}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>倒计时配置</h2>
            <p className={styles.subtitle}>
              {STATUS_LABELS[computed.status]} · {computed.countdown}
              {config.monthlySalary > 0 ? ` · 今日已赚 ¥${computed.todayEarned.toFixed(2)}` : ''}
              {!localShift.isValidShift ? ' · 班次时间无效' : ''}
            </p>
          </div>
        </header>

        <div className={styles.grid}>
          <div className={styles.field}>
            <label>上班时间</label>
            <TimePicker
              format="HH:mm"
              size="middle"
              allowClear={false}
              value={startTimeValue}
              onChange={function (v: Dayjs | null) {
                if (!v) return
                onUpdateLocal(function (c) {
                  return { ...c, workStart: v.format('HH:mm') }
                })
              }}
            />
          </div>

          <div className={styles.field}>
            <label>下班时间</label>
            <TimePicker
              format="HH:mm"
              size="middle"
              allowClear={false}
              value={endTimeValue}
              onChange={function (v: Dayjs | null) {
                if (!v) return
                onUpdateLocal(function (c) {
                  return { ...c, workEnd: v.format('HH:mm') }
                })
              }}
            />
          </div>

          <div className={clsx(styles.field, styles.wide)}>
            <label>工作日</label>
            <Checkbox.Group
              options={WEEKDAY_OPTIONS}
              value={localWorkDays}
              onChange={function (vals) {
                onUpdateLocal(function (c) {
                  return { ...c, workDays: JSON.stringify(vals) }
                })
              }}
            />
          </div>

          <div className={styles.field}>
            <label>月薪（元）</label>
            <InputNumber
              min={0}
              step={100}
              precision={2}
              value={localConfig.monthlySalary || undefined}
              style={{ width: '100%' }}
              onChange={function (v) {
                onUpdateLocal(function (c) {
                  return { ...c, monthlySalary: v ?? 0 }
                })
              }}
            />
          </div>

          <div className={styles.field}>
            <label>发薪日</label>
            <Space.Compact style={{ width: '100%' }}>
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
          </div>
        </div>

        <footer className={styles.footer}>
          <Button
            onClick={function () {
              onUpdateVisible(false)
            }}>
            取消
          </Button>
          <Button
            type="primary"
            icon={
              <Icon
                icon="mdi:content-save-outline"
                width={16}
                height={16}
              />
            }
            onClick={function () {
              void handleSave()
            }}>
            保存
          </Button>
        </footer>
      </div>
    </MagneticTile.Overlay>
  )
}
