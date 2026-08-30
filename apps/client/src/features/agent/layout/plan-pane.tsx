/**
 * 右侧 Plan 面板：展示结构化计划，勾选 / 写日历 / 关闭
 */
import { Icon } from '@iconify/react/offline'
import { Button, Empty, Flex, Typography } from 'antd'

import { PlanList } from '@/features/agent/parts/plan-list'
import styles from '@/features/agent/layout/plan-pane.module.scss'
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
      <Flex
        align="center"
        justify="space-between"
        className={styles.header}>
        <Typography.Text strong>计划</Typography.Text>
        <Button
          type="text"
          aria-label="关闭计划面板"
          icon={<Icon icon="ant-design:close-outlined" />}
          onClick={props.onClose}
        />
      </Flex>
      <div className={styles.body}>
        {props.source ? (
          <PlanList
            data={props.source.data}
            onToggleItem={props.onToggleItem}
            onWriteCalendar={props.onWriteCalendar}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="规划场景生成计划后会显示在这里"
          />
        )}
      </div>
    </div>
  )
}

export { AgentPlanPane }
export type { PlanPaneProps, PlanPaneSource }
