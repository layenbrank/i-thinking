/**
 * 工具审批策略（对应 Qoder 的「访问权限」）。
 *
 * 前两档沿用 Qoder 的命名（**询问审批 / 自动审批**）—— 之前把 ask 叫「自动审批」是错的：
 * 它的行为恰恰是「写之前先问」。
 * 第三档是我们的自有能力（拒绝一切写操作），Qoder 没有对应项，所以不套它的「完全访问」：
 * 那是更宽松的一档，语义正好相反。
 */

const APPROVAL_POLICIES = [
  { value: 'ask', label: '询问审批', hint: '只读工具直接执行，写文件前询问' },
  { value: 'auto', label: '自动审批', hint: '不再询问，工具直接执行' },
  { value: 'readonly', label: '只读', hint: '拒绝一切写操作' }
] as const

type ApprovalPolicy = (typeof APPROVAL_POLICIES)[number]['value']

const DEFAULT_APPROVAL_POLICY: ApprovalPolicy = 'ask'

function findApprovalPolicy(value: ApprovalPolicy) {
  return APPROVAL_POLICIES.find(function (item) {
    return item.value === value
  })
}

export { APPROVAL_POLICIES, DEFAULT_APPROVAL_POLICY, findApprovalPolicy }
export type { ApprovalPolicy }
