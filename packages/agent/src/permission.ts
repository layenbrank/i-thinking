/**
 * 权限门：对齐 opencode v2 `/permissions/` 的 allow/ask/deny 三元，
 * 以及 ACP `session/request_permission`。写类工具默认 ask，只读默认 allow，readonly 全 deny。
 */

type PermissionDecision = 'allow' | 'ask' | 'deny'

/** 会话级审批策略：auto 全放行 / ask 写类询问 / readonly 拒一切写 */
type PermissionMode = 'auto' | 'ask' | 'readonly'

interface PermissionRequest {
  toolCallId: string
  toolName: string
  input: unknown
  /** 给用户看的一句话（工具自给，缺失由 UI 兜底） */
  prompt?: string
}

interface PermissionReply {
  toolCallId: string
  approved: boolean
}

export type { PermissionDecision, PermissionMode, PermissionReply, PermissionRequest }
