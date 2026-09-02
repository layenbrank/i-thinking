/**
 * Goose session 上下文用量（ACP usage_update）
 */
interface GooseUsage {
  used: number
  size: number
}

type UsageListener = (sessionID: string, usage: GooseUsage | null) => void

/** UI sessionID → 最新用量 */
const usageBySession = new Map<string, GooseUsage>()
const listeners = new Set<UsageListener>()

function notify(sessionID: string, usage: GooseUsage | null) {
  for (const listener of listeners) {
    listener(sessionID, usage)
  }
}

function writeGooseUsage(sessionID: string, used: number, size: number) {
  const key = sessionID.trim()
  if (!key) return
  const usage: GooseUsage = {
    used: Math.max(0, Math.floor(used)),
    size: Math.max(0, Math.floor(size))
  }
  usageBySession.set(key, usage)
  notify(key, usage)
}

function clearGooseUsage(sessionID?: string) {
  if (sessionID) {
    const key = sessionID.trim()
    usageBySession.delete(key)
    notify(key, null)
    return
  }
  const keys = [...usageBySession.keys()]
  usageBySession.clear()
  for (const key of keys) {
    notify(key, null)
  }
}

function findGooseUsage(sessionID: string | null | undefined): GooseUsage | null {
  if (!sessionID?.trim()) return null
  return usageBySession.get(sessionID.trim()) ?? null
}

function subscribeGooseUsage(listener: UsageListener): () => void {
  listeners.add(listener)
  return function () {
    listeners.delete(listener)
  }
}

/** Desktop 同款：12k / 128k */
function formatTokenCount(count: number): string {
  if (count >= 1_000_000) return `${Math.round(count / 1_000_000)}M`
  if (count >= 1_000) return `${Math.round(count / 1_000)}k`
  return String(count)
}

function formatGooseUsage(usage: GooseUsage | null): string | null {
  if (!usage || usage.size <= 0) return null
  return `${formatTokenCount(usage.used)} / ${formatTokenCount(usage.size)}`
}

export type { GooseUsage }
export {
  clearGooseUsage,
  findGooseUsage,
  formatGooseUsage,
  formatTokenCount,
  subscribeGooseUsage,
  writeGooseUsage
}
