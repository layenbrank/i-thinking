import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Form, Input, Segmented, Space } from 'antd'
import { clsx } from 'clsx'
import type { Dayjs } from 'dayjs'
import { useEffect, useMemo, useState } from 'react'

import styles from '@/features/magnetic-tiles/calendar/day-agenda.module.scss'
import type { CalendarEvent } from '@/stores/calendar-event'
import type { Reminder } from '@/stores/reminder'

type AgendaKind = 'event' | 'reminder'

type DayAgendaProps = {
  date: Dayjs
  events: CalendarEvent[]
  reminders: Reminder[]
  onWriteEvent(title: string, notes: string): Promise<void>
  onWriteReminder(title: string, notes: string): Promise<void>
  onToggleReminder(id: string, isCompleted: boolean): Promise<void>
  onRemoveEvent(id: string): Promise<void>
  onRemoveReminder(id: string): Promise<void>
}

type AgendaItem = {
  id: string
  kind: AgendaKind
  title: string
  notes: string
  isCompleted?: boolean
  timeLabel: string
}

function formatTimeLabel(ms: number, isAllDay: boolean): string {
  if (isAllDay) return '全天'
  const date = new Date(ms)
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function DayAgenda(props: DayAgendaProps) {
  const {
    date,
    events,
    reminders,
    onWriteEvent,
    onWriteReminder,
    onToggleReminder,
    onRemoveEvent,
    onRemoveReminder
  } = props
  const [composing, onUpdateComposing] = useState(false)
  const [kind, onUpdateKind] = useState<AgendaKind>('reminder')
  const [form] = Form.useForm<{ title: string; notes?: string }>()
  const [submitting, onUpdateSubmitting] = useState(false)
  const dateKey = date.format('YYYY-MM-DD')

  useEffect(
    function () {
      onUpdateComposing(false)
      form.resetFields()
    },
    [dateKey, form]
  )

  const items = useMemo(function (): AgendaItem[] {
    const eventItems: AgendaItem[] = events.map(function (event) {
      return {
        id: event.id,
        kind: 'event',
        title: event.title,
        notes: event.notes,
        timeLabel: formatTimeLabel(event.startAt, event.isAllDay)
      }
    })
    const reminderItems: AgendaItem[] = reminders.map(function (reminder) {
      return {
        id: reminder.id,
        kind: 'reminder',
        title: reminder.title,
        notes: reminder.notes,
        isCompleted: reminder.isCompleted,
        timeLabel: formatTimeLabel(reminder.dueAt, reminder.isAllDay)
      }
    })
    return [...eventItems, ...reminderItems].sort(function (a, b) {
      if (a.timeLabel === '全天' && b.timeLabel !== '全天') return -1
      if (b.timeLabel === '全天' && a.timeLabel !== '全天') return 1
      return a.timeLabel.localeCompare(b.timeLabel)
    })
  }, [events, reminders])

  function handleOpen() {
    form.resetFields()
    onUpdateKind('reminder')
    onUpdateComposing(true)
  }

  function handleCancel() {
    onUpdateComposing(false)
    form.resetFields()
  }

  async function handleSubmit() {
    const values = await form.validateFields()
    onUpdateSubmitting(true)
    try {
      if (kind === 'event') {
        await onWriteEvent(values.title.trim(), values.notes?.trim() ?? '')
      } else {
        await onWriteReminder(values.title.trim(), values.notes?.trim() ?? '')
      }
      onUpdateComposing(false)
      form.resetFields()
    } finally {
      onUpdateSubmitting(false)
    }
  }

  return (
    <section className={styles.root}>
      <header className={styles.header}>
        <div className={styles.headerMain}>
          <h3 className={styles.title}>日程</h3>
          <span className={styles.subtitle}>{date.format('M月D日')}</span>
          <span className={styles.count}>{items.length} 项</span>
        </div>
        {!composing ? (
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={handleOpen}>
            添加
          </Button>
        ) : null}
      </header>

      <div className={clsx(styles.composer, !composing && styles.composerHidden)} aria-hidden={!composing}>
        <Segmented
          size="small"
          block
          value={kind}
          onChange={function (value) {
            onUpdateKind(value as AgendaKind)
          }}
          options={[
            { label: '提醒', value: 'reminder' },
            { label: '事件', value: 'event' }
          ]}
        />
        <Form
          form={form}
          layout="vertical"
          size="small"
          requiredMark={false}
          className={styles.composerForm}
          onFinish={function () {
            void handleSubmit()
          }}>
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="例如：周会 / 客户跟进" maxLength={80} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <Input.TextArea placeholder="可选" rows={2} maxLength={200} />
          </Form.Item>
        </Form>
        <Space size={8} className={styles.composerActions}>
          <Button size="small" onClick={handleCancel}>
            取消
          </Button>
          <Button
            type="primary"
            size="small"
            loading={submitting}
            onClick={function () {
              void handleSubmit()
            }}>
            保存
          </Button>
        </Space>
      </div>

      <div className={styles.list}>
        {items.length === 0 && !composing ? (
          <div className={styles.empty}>
            <div className={styles.emptyTitle}>当日暂无日程</div>
            <div className={styles.emptyDesc}>可添加提醒或事件，便于跟进当日安排。</div>
            <Button type="link" size="small" icon={<PlusOutlined />} onClick={handleOpen}>
              新建日程
            </Button>
          </div>
        ) : null}
        {items.map(function (item) {
          return (
            <div key={`${item.kind}-${item.id}`} className={styles.item}>
              <div
                className={clsx(styles.accent, item.kind === 'reminder' && styles.accentReminder)}
              />
              {item.kind === 'reminder' ? (
                <Checkbox
                  checked={Boolean(item.isCompleted)}
                  onChange={function (e) {
                    void onToggleReminder(item.id, e.target.checked)
                  }}
                />
              ) : null}
              <div className={styles.itemBody}>
                <div className={clsx(styles.itemTitle, item.isCompleted && styles.itemTitleDone)}>
                  {item.title}
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.kind}>{item.kind === 'event' ? '事件' : '提醒'}</span>
                  <span>{item.timeLabel}</span>
                  {item.notes ? <span className={styles.notes}>{item.notes}</span> : null}
                </div>
              </div>
              <Button
                type="text"
                size="small"
                className={styles.remove}
                icon={<DeleteOutlined />}
                onClick={function () {
                  if (item.kind === 'event') {
                    void onRemoveEvent(item.id)
                  } else {
                    void onRemoveReminder(item.id)
                  }
                }}
              />
            </div>
          )
        })}
      </div>
    </section>
  )
}

export { DayAgenda }
export type { DayAgendaProps }
