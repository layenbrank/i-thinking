/**
 * 规划部件：计划清单勾选 + 一键写入日历
 */
import { Icon } from '@iconify/react/offline'
import { Button, Checkbox, Flex, Tag, Typography } from 'antd'
import { useState } from 'react'

import type { PlanPartData } from '@/features/agent/types'

interface PlanListProps {
  data: PlanPartData
  onToggleItem: (itemIndex: number) => void
  onWriteCalendar: () => Promise<void>
}

function PlanList(props: PlanListProps) {
  const { data, onToggleItem } = props
  const [writing, updateWriting] = useState(false)

  return (
    <Flex
      vertical
      gap={8}
      style={{
        padding: '8px 12px',
        border: '1px solid var(--ith-color-border)',
        borderRadius: 'var(--ith-border-radius)',
        background: 'var(--ith-color-bg-container)'
      }}>
      <Flex align="center" gap={8}>
        <Typography.Text strong>日程计划</Typography.Text>
        {data.date && <Tag>{data.date}</Tag>}
        <Button
          size="small"
          icon={<Icon icon="ant-design:calendar-outlined" />}
          loading={writing}
          style={{ marginLeft: 'auto' }}
          onClick={async function () {
            updateWriting(true)
            try {
              await props.onWriteCalendar()
            } finally {
              updateWriting(false)
            }
          }}>
          写入日历
        </Button>
      </Flex>
      <Flex vertical gap={4}>
        {data.items.map(function (item, itemIndex) {
          return (
            <Flex
              key={`${item.time ?? ''}-${item.title}`}
              align="center"
              gap={8}>
              <Checkbox
                checked={Boolean(item.done)}
                onChange={function () {
                  onToggleItem(itemIndex)
                }}
              />
              {item.time && <Tag>{item.time}</Tag>}
              <Typography.Text
                delete={Boolean(item.done)}
                type={item.done ? 'secondary' : undefined}>
                {item.title}
              </Typography.Text>
            </Flex>
          )
        })}
      </Flex>
    </Flex>
  )
}

export { PlanList }
export type { PlanListProps }
