/**
 * 一组工具调用的统计（Qoder 的「执行工具 59 次，其中 2 次失败」）。
 *
 * 抽成纯函数是因为折叠条只看得到 `indices`，真正的成败在消息部件上 ——
 * 这段索引到状态的对应关系最容易写错（越界、非工具部件、审批中算不算失败）。
 */

/**
 * 只声明我们真正读的字段。
 *
 * 不用 `ThreadMessage['content'][number]`：按 `type` 收窄后拿到的是
 * `ToolCallMessagePart`（`@assistant-ui/react` 从 `assistant-stream` 转出的），
 * 它身上**没有** `status`；而 `state.message.parts` 的元素是带 `status` 的状态型部件。
 * 用结构类型两边都能接。
 */
interface ToolPartLike {
  type: string
  isError?: boolean
  status?: { type: string }
}

/**
 * 失败口径：
 * - `isError === true`（工具返回了错误）
 * - `status.type === 'incomplete'`（适配器把 isError 归一化成的状态）
 *
 * 「等待审批」（`requires-action`）**不算失败** —— 它还没跑，算进去会让正在跑的回合
 * 一上来就显示「有失败」。
 *
 * 单独导出是因为右栏的「执行工具」统计也按同一口径数失败：折条与右栏同时挂在屏幕上，
 * 两处数字对不上比不显示更糟。
 */
function isFailedToolPart(part: ToolPartLike): boolean {
  if (part.type !== 'tool-call') return false
  return part.isError === true || part.status?.type === 'incomplete'
}

function countToolFailures(parts: readonly ToolPartLike[], indices: readonly number[]): number {
  let failed = 0

  for (const index of indices) {
    const part = parts[index]
    if (!part) continue
    if (isFailedToolPart(part)) failed += 1
  }

  return failed
}

export { countToolFailures, isFailedToolPart }
export type { ToolPartLike }
