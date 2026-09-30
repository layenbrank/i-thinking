import { useAuiState } from '@assistant-ui/react'
import { useAssistantLabels } from '@i-thinking/design/assistant/labels'
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
 * 思考段的折叠条（覆盖 `ThreadComponents.ReasoningGroup`）。
 *
 * 「思考」段只是整轮过程里的一段（新会话里过程由 `AgentProcessFold` 兜住），
 * 所以这里不给秒数 —— 整轮的耗时算在外层那条上，贴到这里就等于同一段时间报两遍。
 * 「折叠回复过程」也由外层管：这里只按段自己的状态决定流式展开。
 */

interface ProcessGroupProps {
  group: ThreadGroupPart
}

export function AgentProcessGroup(props: PropsWithChildren<ProcessGroupProps>) {
  const isActive = props.group.status.type === 'running'

  return (
    <ReasoningRoot streaming={isActive}>
      <ReasoningTrigger active={isActive} />
      <ReasoningContent aria-busy={isActive}>
        <ReasoningText>{props.children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  )
}

/**
 * 整轮「过程」折叠条（覆盖 `ThreadComponents.ProcessGroup`）：**最终回答之前的一切**
 * （思考、工具、中间解说）都收在里面，最终回答留在外面常驻可见。
 *
 * 设计包的 `ReasoningRoot` 自带「流式时展开、结束后回到 defaultOpen」的语义，所以
 * 「折叠回复过程」= `defaultOpen={!collapseProcess}`，这里不用自己管开关状态
 * （手动切换由库里的 userOpen 接管）。展开与否看 `running`（整条消息），不看过程区的
 * part 状态 —— 模型在两步之间停顿的那一瞬间不该把已经读起来的过程弹回去。
 *
 * 耗时取整条助手消息的 `timing.totalStreamTime`；runtime 没填时就不显示秒数 ——
 * 编一个数字出来比不显示更糟。
 */

interface ProcessFoldProps {
  group: ThreadGroupPart
  running: boolean
}

export function AgentProcessFold(props: PropsWithChildren<ProcessFoldProps>) {
  const labels = useAssistantLabels()
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
      streaming={props.running}
      defaultOpen={!collapseProcess}>
      <ReasoningTrigger
        active={props.running}
        label={labels.process(props.group.indices.length, seconds)}
      />
      <ReasoningContent aria-busy={props.running}>
        <ReasoningText>{props.children}</ReasoningText>
      </ReasoningContent>
    </ReasoningRoot>
  )
}
