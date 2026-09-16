import type { ThreadTokenUsage } from '@assistant-ui/ai-sdk'

/**
 * 用量格式化：离线通路的用量来自主进程 `finish` 事件（已存进消息 `metadata.custom.usage`），
 * 在线通路来自 AI SDK —— 两者都由 `useThreadTokenUsage` 读出。
 */
function formatCount(value: number | undefined): string {
  return value === undefined ? '-' : String(value)
}

/** 输入框底栏用：`1.2k` 口径；无可读字段时返回 null */
function formatTokenShort(count: number): string {
  if (count >= 1_000_000) return `${Math.round(count / 1_000_000)}M`
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`
  return String(count)
}

function formatUsageCompact(usage: ThreadTokenUsage | undefined): string | null {
  if (!usage) return null

  const used = usage.totalTokens ?? usage.inputTokens
  if (used === undefined) return null

  // 有缓存命中时顺带标一下，避免只看合计看不出「其实在吃缓存」
  if (usage.cachedInputTokens !== undefined && usage.cachedInputTokens > 0) {
    return `${formatTokenShort(used)} · 缓存 ${formatTokenShort(usage.cachedInputTokens)}`
  }

  return formatTokenShort(used)
}

/** 右栏详述：无可读字段时返回 null（不渲染用量行） */
function formatUsage(usage: ThreadTokenUsage | undefined): string | null {
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

export { formatUsage, formatUsageCompact }
