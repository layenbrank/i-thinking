import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@i-thinking/design/components/select'

import {
  APPROVAL_POLICIES,
  findApprovalPolicy,
  type ApprovalPolicy
} from '@/features/chat/approval.ts'
import { useAgentStore } from '@/stores/agent.ts'

/** 顶栏里的审批策略快捷切换；完整说明在设置弹窗的「模型」页签 */
export function ApprovalSwitch() {
  const approval = useAgentStore(function (state) {
    return state.settings.chat.approval
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  const current = findApprovalPolicy(approval)

  return (
    <Select
      value={approval}
      onValueChange={function (value) {
        void update('chat', { approval: value as ApprovalPolicy })
      }}>
      <SelectTrigger
        className="hover:bg-accent-hover h-7 w-auto gap-1 border-transparent bg-transparent px-2 text-xs shadow-none dark:bg-transparent"
        aria-label="工具审批策略"
        title={current?.hint}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {APPROVAL_POLICIES.map(function (policy) {
          return (
            <SelectItem
              key={policy.value}
              value={policy.value}
              title={policy.hint}>
              {policy.label}
            </SelectItem>
          )
        })}
      </SelectContent>
    </Select>
  )
}
