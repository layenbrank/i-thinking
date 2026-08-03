import { Icon } from '@iconify/react/offline'
import { App, Button, Input, Switch, TimePicker, theme } from 'antd'
import { clsx } from 'clsx'
import dayjs, { type Dayjs } from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import { paintPrimary } from '@/features/magnetic-tile/paint'
import {
  findClockReminders,
  findEnabledCount,
  findNextReminder,
  formatWeekDays,
  parseWeekDays
} from '@/features/magnetic-tiles/clock/alarm-time'
import styles from '@/features/magnetic-tiles/clock/overlay.module.scss'
import { useClockStore, type ClockStyle } from '@/stores/clock'
import { useReminderStore, type Reminder } from '@/stores/reminder'

const STYLES: { value: ClockStyle; label: string; hint: string }[] = [
  { value: 'digital', label: '数字', hint: '清晰数字时钟' },
  { value: 'analog', label: '指针', hint: '经典表盘' },
  { value: 'flip', label: '翻页', hint: '分段卡片' },
  { value: 'neon', label: '强调', hint: '主色点缀' },
  { value: 'minimal', label: '极简', hint: '轻量字距' }
]

const WEEKDAY_OPTIONS = [
  { label: '一', value: 1 },
  { label: '二', value: 2 },
  { label: '三', value: 3 },
  { label: '四', value: 4 },
  { label: '五', value: 5 },
  { label: '六', value: 6 },
  { label: '日', value: 7 }
]

const SNOOZE_MS = 9 * 60 * 1000

interface Draft {
  title: string
  fireTime: string
  weekDays: number[]
}

const EMPTY_DRAFT: Draft = {
  title: '闹钟',
  fireTime: '07:00',
  weekDays: []
}

function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)
  const { message } = App.useApp()
  const { token } = theme.useToken()
  const { clockStyle, updateClockStyle } = useClockStore()
  const reminders = useReminderStore(function (s) {
    return s.reminders
  })
  const readReminders = useReminderStore(function (s) {
    return s.readReminders
  })
  const writeReminder = useReminderStore(function (s) {
    return s.writeReminder
  })
  const updateReminder = useReminderStore(function (s) {
    return s.updateReminder
  })
  const removeReminder = useReminderStore(function (s) {
    return s.removeReminder
  })

  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })
  const [editingId, onUpdateEditingId] = useState<string | null>(null)
  const [draft, onUpdateDraft] = useState<Draft>(EMPTY_DRAFT)
  const [isCreating, onUpdateCreating] = useState(false)
  const [saving, onUpdateSaving] = useState(false)

  const palette = useMemo(
    function () {
      return paintPrimary(token.colorPrimary)
    },
    [token.colorPrimary]
  )

  const clockReminders = useMemo(
    function () {
      return findClockReminders(reminders)
    },
    [reminders]
  )

  useEffect(
    function () {
      void readReminders()
    },
    [readReminders]
  )

  useEffect(
    function () {
      let unlisten: (() => void) | undefined
      void import('@tauri-apps/api/event').then(function (mod) {
        void mod
          .listen('reminder:fired', function () {
            void readReminders()
          })
          .then(function (fn) {
            unlisten = fn
          })
      })
      return function () {
        unlisten?.()
      }
    },
    [readReminders]
  )

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const previewTime = clockStyle === 'minimal' ? now.format('HH:mm') : now.format('HH:mm:ss')
  const nextFire = useMemo(
    function () {
      return findNextReminder(clockReminders, now)
    },
    [clockReminders, now]
  )
  const enabledTotal = useMemo(
    function () {
      return findEnabledCount(clockReminders)
    },
    [clockReminders]
  )

  const draftTimeValue = useMemo(
    function () {
      const [h, m] = draft.fireTime.split(':').map(Number)
      return dayjs()
        .hour(h || 0)
        .minute(m || 0)
        .second(0)
    },
    [draft.fireTime]
  )

  function beginCreate() {
    onUpdateCreating(true)
    onUpdateEditingId(null)
    onUpdateDraft({
      ...EMPTY_DRAFT,
      fireTime: now.add(1, 'hour').startOf('hour').format('HH:mm')
    })
  }

  function beginEdit(reminder: Reminder) {
    onUpdateCreating(false)
    onUpdateEditingId(reminder.id)
    onUpdateDraft({
      title: reminder.title || '闹钟',
      fireTime: reminder.fireTime || '07:00',
      weekDays: parseWeekDays(reminder.weekDays)
    })
  }

  function cancelEdit() {
    onUpdateCreating(false)
    onUpdateEditingId(null)
    onUpdateDraft(EMPTY_DRAFT)
  }

  function toggleDraftDay(day: number) {
    onUpdateDraft(function (prev) {
      const next = prev.weekDays.includes(day)
        ? prev.weekDays.filter(function (d) {
            return d !== day
          })
        : [...prev.weekDays, day].sort(function (a, b) {
            return a - b
          })
      return { ...prev, weekDays: next }
    })
  }

  async function handleSaveDraft() {
    onUpdateSaving(true)
    try {
      const weekDays = JSON.stringify(draft.weekDays)
      if (isCreating) {
        const id = await writeReminder({
          title: draft.title.trim() || '闹钟',
          fireTime: draft.fireTime,
          weekDays,
          enabled: true
        })
        if (!id) throw new Error('write failed')
        message.success('已添加闹钟')
      } else if (editingId) {
        await updateReminder({
          key: editingId,
          change: {
            title: draft.title.trim() || '闹钟',
            fireTime: draft.fireTime,
            weekDays
          }
        })
        message.success('已更新')
      }
      cancelEdit()
    } catch {
      message.error('保存失败')
    } finally {
      onUpdateSaving(false)
    }
  }

  async function handleToggle(reminder: Reminder, enabled: boolean) {
    try {
      await updateReminder({
        key: reminder.id,
        change: { enabled, snoozeUntil: null }
      })
    } catch {
      message.error('更新失败')
    }
  }

  async function handleRemove(id: string) {
    try {
      await updateReminder({
        key: id,
        change: { archivedAt: Date.now() }
      })
      if (editingId === id) cancelEdit()
      message.success('已归档')
    } catch {
      try {
        await removeReminder(id)
        if (editingId === id) cancelEdit()
        message.success('已删除')
      } catch {
        message.error('删除失败')
      }
    }
  }

  async function handleSnooze(reminder: Reminder) {
    try {
      await updateReminder({
        key: reminder.id,
        change: {
          enabled: true,
          snoozeUntil: Date.now() + SNOOZE_MS
        }
      })
      message.success('已延后 9 分钟')
    } catch {
      message.error('延后失败')
    }
  }

  const isEditing = isCreating || editingId !== null

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
        <Button
          type="primary"
          onClick={function () {
            onUpdateVisible(false)
          }}>
          完成
        </Button>
      }>
      <div className={styles.stage}>
        <div className={clsx(styles.preview, styles[clockStyle])}>
          <div className={styles.previewHero}>
            <div className={styles.previewMetric}>
              <span className={styles.previewLabel}>现在</span>
              <span className={styles.previewTime}>{previewTime}</span>
            </div>
            <div className={styles.previewMetric}>
              <span className={styles.previewLabel}>日期</span>
              <span className={styles.previewDate}>{now.format('M月D日 dddd')}</span>
            </div>
          </div>

          <div className={styles.previewFacts}>
            <div className={styles.fact}>
              <span className={styles.factLabel}>下一条</span>
              <span className={styles.factValue}>
                {nextFire
                  ? `${nextFire.reminder.fireTime} ${nextFire.reminder.title || '闹钟'}`
                  : '暂无'}
              </span>
            </div>
            <div className={styles.fact}>
              <span className={styles.factLabel}>已开启</span>
              <span className={styles.factValue}>
                {enabledTotal} / {clockReminders.length}
              </span>
            </div>
          </div>

          <div className={styles.previewBottom}>
            <span className={styles.previewStatus}>
              <Icon
                icon="mdi:alarm"
                width={14}
                height={14}
              />
              {STYLES.find(function (s) {
                return s.value === clockStyle
              })?.label ?? '时钟'}
            </span>
            <span className={styles.previewRange}>{now.format('HH:mm:ss')}</span>
          </div>
        </div>

        <div className={styles.formCard}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>外观</h3>
            <div
              className={styles.styleList}
              role="radiogroup"
              aria-label="时钟样式">
              {STYLES.map(function (item) {
                const isActive = clockStyle === item.value
                return (
                  <button
                    key={item.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={clsx(styles.styleRow, isActive && styles.styleRowActive)}
                    onClick={function () {
                      updateClockStyle(item.value)
                    }}>
                    <div className={styles.styleMeta}>
                      <span className={styles.styleLabel}>{item.label}</span>
                      <span className={styles.styleHint}>{item.hint}</span>
                    </div>
                    <span className={clsx(styles.mini, styles[item.value])}>
                      {item.value === 'analog' ? (
                        <span className={styles.miniFace} />
                      ) : (
                        <span className={styles.miniTime}>12:00</span>
                      )}
                    </span>
                    <span
                      className={styles.accent}
                      style={{ background: isActive ? palette[5] : palette[2] }}
                    />
                  </button>
                )
              })}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>闹钟</h3>
              {!isEditing ? (
                <Button
                  type="link"
                  size="small"
                  onClick={beginCreate}>
                  添加
                </Button>
              ) : null}
            </div>

            {isEditing ? (
              <div className={styles.editor}>
                <div className={styles.editorGrid}>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>时间</span>
                    <TimePicker
                      format="HH:mm"
                      allowClear={false}
                      value={draftTimeValue}
                      className={styles.control}
                      onChange={function (v: Dayjs | null) {
                        if (!v) return
                        onUpdateDraft(function (d) {
                          return { ...d, fireTime: v.format('HH:mm') }
                        })
                      }}
                    />
                  </label>
                  <label className={styles.field}>
                    <span className={styles.fieldLabel}>标签</span>
                    <Input
                      value={draft.title}
                      maxLength={32}
                      className={styles.control}
                      onChange={function (e) {
                        const value = e.target.value
                        onUpdateDraft(function (d) {
                          return { ...d, title: value }
                        })
                      }}
                    />
                  </label>
                </div>
                <div className={styles.dayBlock}>
                  <span className={styles.dayLabel}>重复（不选为仅一次）</span>
                  <div
                    className={styles.dayChips}
                    role="group"
                    aria-label="重复星期">
                    {WEEKDAY_OPTIONS.map(function (opt) {
                      const isOn = draft.weekDays.includes(opt.value)
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={clsx(styles.dayChip, isOn && styles.dayChipOn)}
                          aria-pressed={isOn}
                          onClick={function () {
                            toggleDraftDay(opt.value)
                          }}>
                          {opt.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className={styles.editorActions}>
                  <Button onClick={cancelEdit}>取消</Button>
                  <Button
                    type="primary"
                    loading={saving}
                    onClick={function () {
                      void handleSaveDraft()
                    }}>
                    保存
                  </Button>
                </div>
              </div>
            ) : null}

            <div className={styles.alarmList}>
              {clockReminders.length === 0 && !isEditing ? (
                <button
                  type="button"
                  className={styles.empty}
                  onClick={beginCreate}>
                  <Icon
                    icon="mdi:alarm-plus"
                    width={20}
                    height={20}
                  />
                  <span>添加闹钟</span>
                </button>
              ) : null}
              {clockReminders.map(function (reminder) {
                return (
                  <div
                    key={reminder.id}
                    className={clsx(
                      styles.alarmItem,
                      editingId === reminder.id && styles.alarmItemActive
                    )}>
                    <button
                      type="button"
                      className={styles.alarmMain}
                      onClick={function () {
                        beginEdit(reminder)
                      }}>
                      <span className={styles.alarmTime}>{reminder.fireTime}</span>
                      <span className={styles.alarmMeta}>
                        <span className={styles.alarmTitle}>{reminder.title || '闹钟'}</span>
                        <span className={styles.alarmHint}>
                          {formatWeekDays(reminder.weekDays)}
                          {reminder.snoozeUntil && reminder.snoozeUntil > Date.now()
                            ? ` · 延后至 ${dayjs(reminder.snoozeUntil).format('HH:mm')}`
                            : ''}
                        </span>
                      </span>
                    </button>
                    <div className={styles.alarmActions}>
                      <Button
                        type="text"
                        size="small"
                        aria-label="延后 9 分钟"
                        onClick={function () {
                          void handleSnooze(reminder)
                        }}>
                        <Icon
                          icon="mdi:sleep"
                          width={16}
                          height={16}
                        />
                      </Button>
                      <Button
                        type="text"
                        size="small"
                        danger
                        aria-label="归档"
                        onClick={function () {
                          void handleRemove(reminder.id)
                        }}>
                        <Icon
                          icon="mdi:trash-can-outline"
                          width={16}
                          height={16}
                        />
                      </Button>
                      <Switch
                        size="small"
                        checked={reminder.enabled}
                        onChange={function (checked) {
                          void handleToggle(reminder, checked)
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </MagneticTile.Overlay>
  )
}

export default Overlay
