import { useAuiState } from '@assistant-ui/react'
import {
  ReasoningContent,
  ReasoningRoot,
  ReasoningText,
  ReasoningTrigger
} from '@i-thinking/design/assistant/reasoning.aui'
import type { ThreadGroupPart } from '@i-thinking/design/assistant/thread.aui'
import type { PropsWithChildren } from 'react'

import { formatDurationSeconds } from '@/features/agent/duration.ts'
import { useAgentStore } from '@/stores/agent.ts'

/**
 * 回复过程折叠条（覆盖 `ThreadComponents.ReasoningGroup`）。
 *
 * 设计包的 `ReasoningRoot` 已经自带「流式时展开、结束后回到 defaultOpen」的语义，
 * 所以「折叠回复过程」= `defaultOpen={!collapseProcess}`，这里不需要再管开关状态
 * （手动切换由库里的 userOpen 接管）。
 *
 * 耗时取整条助手消息的 `timing.totalStreamTime`；runtime 没填时就不显示秒数 ——
 * 编一个数字出来比不显示更糟。
 */

interface ProcessGroupProps {
  group: ThreadGroupPart
}

export function AgentProcessGroup(props: PropsWithChildren<ProcessGroupProps>) {
  const isActive = props.group.status.type === 'running'
  const collapseProcess = useAgentStore(function (state) {
    return state.settings.chat.collapseProcess
  })
  const durationFormat = useAgentStore(function (state) {
    return state.settings.chat.durationFormat
  })
  // `timing` 挂在 metadata 上（`MessageState` 本身没有这个字段）
  const totalStreamTime = useAuiState(function (state) {
    return state.message.metadata.timing?.totalStreamTime
  })

  const seconds =
    totalStreamTime === undefined
      ? undefined
      : formatDurationSeconds(totalStreamTime, durationFormat)

  return (
    <ReasoningRoot
      streaming={isActive}
      defaultOpen={!collapseProcess}>
      <ReasoningTrigger
        active={isActive}
        {...(seconds === undefined ? {} : { duration: seconds })}
      />
      <ReasoningContent aria-busy={isActive}>
        <ReasoningText>{props.children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  )
}
