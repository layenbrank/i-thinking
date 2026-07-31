import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Checkbox, Empty, Form, Input, Modal, Segmented, Space, Typography } from 'antd'
import { createStyles } from 'antd-style'
import type { Dayjs } from 'dayjs'
import { useMemo, useState } from 'react'

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

const useStyle = createStyles(function ({ token, css }) {
  return {
    root: css`
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-height: 0;
      flex: 1;
    `,
    header: css`
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    `,
    title: css`
      font-size: 13px;
      font-weight: 600;
      color: ${token.colorText};
    `,
    list: css`
      display: flex;
      flex-direction: column;
      gap: 6px;
      overflow: auto;
      min-height: 0;
      flex: 1;
      padding-right: 2px;
    `,
    item: css`
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      border-radius: ${token.borderRadius}px;
      background: ${token.colorFillTertiary};
      border: 1px solid transparent;
      transition:
        background-color 200ms ease,
        border-color 200ms ease;
      cursor: default;
      &:hover {
        border-color: ${token.colorBorderSecondary};
        background: ${token.colorFillSecondary};
      }
    `,
    itemBody: css`
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
    `,
    itemTitle: css`
      font-size: 13px;
      font-weight: 500;
      color: ${token.colorText};
      line-height: 1.3;
      &.done {
        text-decoration: line-through;
        color: ${token.colorTextQuaternary};
      }
    `,
    itemMeta: css`
      font-size: 11px;
      color: ${token.colorTextSecondary};
    `,
    accent: css`
      width: 3px;
      align-self: stretch;
      border-radius: 2px;
      background: ${token.colorPrimary};
      flex-shrink: 0;
      &.reminder {
        background: ${token.colorWarning};
      }
    `,
    remove: css`
      opacity: 0.55;
      &:hover {
        opacity: 1;
        color: ${token.colorError} !important;
      }
    `
  }
})

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
  const { styles, cx } = useStyle()
  const [open, onUpdateOpen] = useState(false)
  const [kind, onUpdateKind] = useState<AgendaKind>('reminder')
  const [form] = Form.useForm<{ title: string; notes?: string }>()
  const [submitting, onUpdateSubmitting] = useState(false)

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
    onUpdateOpen(true)
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
      onUpdateOpen(false)
    } finally {
      onUpdateSubmitting(false)
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <div className={styles.title}>日程 · {date.format('M月D日')}</div>
        <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleOpen}>
          添加
        </Button>
      </div>

      <div className={styles.list}>
        {items.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无日程或提醒"
            style={{ margin: '12px 0' }}
          />
        ) : (
          items.map(function (item) {
            return (
              <div key={`${item.kind}-${item.id}`} className={styles.item}>
                <div className={cx(styles.accent, item.kind === 'reminder' && 'reminder')} />
                {item.kind === 'reminder' ? (
                  <Checkbox
                    checked={Boolean(item.isCompleted)}
                    onChange={function (e) {
                      void onToggleReminder(item.id, e.target.checked)
                    }}
                  />
                ) : null}
                <div className={styles.itemBody}>
                  <div className={cx(styles.itemTitle, item.isCompleted && 'done')}>
                    {item.title}
                  </div>
                  <div className={styles.itemMeta}>
                    {item.kind === 'event' ? '事件' : '提醒'} · {item.timeLabel}
                    {item.notes ? ` · ${item.notes}` : ''}
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
          })
        )}
      </div>

      <Modal
        title="添加日程"
        open={open}
        onCancel={function () {
          onUpdateOpen(false)
        }}
        onOk={function () {
          void handleSubmit()
        }}
        confirmLoading={submitting}
        destroyOnHidden
        okText="保存"
        cancelText="取消">
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Segmented
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
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {kind === 'reminder'
              ? '提醒独立存储，后续提醒磁贴可直接复用。'
              : '日历归属日历；可后续再关联提醒。'}
          </Typography.Text>
          <Form form={form} layout="vertical" requiredMark={false}>
            <Form.Item
              name="title"
              label="标题"
              rules={[{ required: true, message: '请输入标题' }]}>
              <Input placeholder="例如：开会 / 买菜" maxLength={80} />
            </Form.Item>
            <Form.Item name="notes" label="备注">
              <Input.TextArea placeholder="可选" rows={2} maxLength={200} />
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </div>
  )
}

export { DayAgenda }
export type { DayAgendaProps }
