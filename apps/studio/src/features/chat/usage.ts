import type { ThreadTokenUsage } from '@assistant-ui/ai-sdk'

/**
 * 用量格式化：离线通路的用量来自主进程 `finish` 事件（已存进消息 `metadata.custom.usage`），
 * 在线通路来自 AI SDK —— 两者都由 `useThreadTokenUsage` 读出。
 */
function formatCount(value: number | undefined): string {
  return value === undefined ? '-' : String(value)
}

/** 无可读字段时返回 null（不渲染用量行） */
export function formatUsage(usage: ThreadTokenUsage | undefined): string | null {
  if (!usage) return null

  const parts = [
    `输入 ${formatCount(usage.inputTokens)}`,
    `输出 ${formatCount(usage.outputTokens)}`,
    `合计 ${formatCount(usage.totalTokens)}`
  ]

  if (usage.reasoningTokens !== undefined) parts.push(`推理 ${formatCount(usage.reasoningTokens)}`)
  if (usage.cachedInputTokens !== undefined) parts.push(`缓存 ${formatCount(usage.cachedInputTokens)}`)

  return parts.join(' · ')
}
