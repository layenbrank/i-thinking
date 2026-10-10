/**
 * 右侧 Plan 面板：展示结构化计划，勾选 / 写日历 / 关闭
 */
import { Icon } from '@iconify/react/offline'
import { Button } from '@i-thinking/design/components/button'

import { PlanList } from './plan-list'
import styles from './plan-pane.module.scss'
import type { PlanPartData } from '@/features/agent/types'

interface PlanPaneSource {
  messageID: string
  partIndex: number
  data: PlanPartData
}

interface PlanPaneProps {
  className?: string
  source: PlanPaneSource | null
  onClose: () => void
  onToggleItem: (itemIndex: number) => void
  onWriteCalendar: () => Promise<void>
}

function AgentPlanPane(props: PlanPaneProps) {
  return (
    <div className={props.className ?? styles.root}>
      <div className={`${styles.header} flex items-center justify-between`}>
        <span className="text-sm font-medium">计划</span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="关闭计划面板"
          onClick={props.onClose}>
          <Icon icon="lucide:x" />
        </Button>
      </div>
      <div className={styles.body}>
        {props.source ? (
          <PlanList
            data={props.source.data}
            onToggleItem={props.onToggleItem}
            onWriteCalendar={props.onWriteCalendar}
          />
        ) : (
          <div className="text-muted-foreground px-4 py-12 text-center text-sm">
            规划场景生成计划后会显示在这里
          </div>
        )}
      </div>
    </div>
  )
}

export { AgentPlanPane }
export type { PlanPaneProps, PlanPaneSource }
