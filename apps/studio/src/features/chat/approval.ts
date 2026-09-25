/**
 * 工具审批策略（对应 Qoder 的「访问权限」）。
 *
 * 前两档沿用 Qoder 的命名（**询问审批 / 自动审批**）—— 之前把 ask 叫「自动审批」是错的：
 * 它的行为恰恰是「写之前先问」。
 * 第三档是我们的自有能力（不给写工具），Qoder 没有对应项，所以不套它的「完全访问」：
 * 那是更宽松的一档，语义正好相反。
 *
 * 档位的**取值**是跨进程契约，声明在 `shared/agent-tools.ts`（主进程按它裁剪工具面）；
 * 这里只管界面文案。
 */

import type { AgentApprovalMode } from '@/shared/agent-tools'

interface ApprovalPolicyMeta {
  value: AgentApprovalMode
  label: string
  hint: string
}

const APPROVAL_POLICIES: readonly ApprovalPolicyMeta[] = [
  { value: 'ask', label: '询问审批', hint: '只读工具直接执行，写文件前询问' },
  { value: 'auto', label: '自动审批', hint: '不再询问，工具直接执行' },
  { value: 'readonly', label: '只读', hint: '不给写文件与执行命令的工具' }
]

const DEFAULT_APPROVAL_POLICY: AgentApprovalMode = 'ask'

/**
 * 从界面来的字符串里认出档位。收 `string` 而不是 `AgentApprovalMode`：值来自
 * Select / 持久化的旧数据，都不可信；认不出返回 null（而不是硬转），让调用方无处可漏。
 */
function findApprovalPolicy(value: string): ApprovalPolicyMeta | null {
  return (
    APPROVAL_POLICIES.find(function (item) {
      return item.value === value
    }) ?? null
  )
}

export { APPROVAL_POLICIES, DEFAULT_APPROVAL_POLICY, findApprovalPolicy }
export type { ApprovalPolicyMeta }
