/**
 * 规划部件：计划清单勾选 + 一键写入日历
 */
import { Icon } from '@iconify/react/offline'
import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Checkbox } from '@i-thinking/design/components/checkbox'
import { Spinner } from '@i-thinking/design/components/spinner'
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
    <div className="border-border bg-card flex flex-col gap-2 rounded-lg border px-3 py-2">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">日程计划</span>
        {data.date && <Badge variant="secondary">{data.date}</Badge>}
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          disabled={writing}
          onClick={async function () {
            updateWriting(true)
            try {
              await props.onWriteCalendar()
            } finally {
              updateWriting(false)
            }
          }}>
          {writing ? <Spinner /> : <Icon icon="lucide:calendar" />}
          写入日历
        </Button>
      </div>
      <div className="flex flex-col gap-1">
        {data.items.map(function (item, itemIndex) {
          return (
            <label
              key={`${item.time ?? ''}-${item.title}`}
              className="flex items-center gap-2">
              <Checkbox
                checked={Boolean(item.done)}
                onCheckedChange={function () {
                  onToggleItem(itemIndex)
                }}
              />
              {item.time && <Badge variant="outline">{item.time}</Badge>}
              <span
                className={item.done ? 'text-muted-foreground text-sm line-through' : 'text-sm'}>
                {item.title}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

export { PlanList }
export type { PlanListProps }
