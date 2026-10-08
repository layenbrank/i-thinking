/**
 * 运行能力：一个指令支不支持定时（cron）与文件变更（watch）触发。
 *
 * 单独成文件的原因：这些是**纯逻辑 + 一次带缓存的读取**，与菜单组件无关；
 * 和组件放一起会让 `run-menu.tsx` 同时导出组件与函数（React Fast Refresh 失去热边界）。
 *
 * 三个来源，精度递增：
 * - 墙面卡片的摘要（`capsFromSummary`）：列表接口顺带给的，可能只有 `trigger_count`；
 * - 编辑器草稿的 triggers（`capsFromTriggers`）：正在编辑，未必已落盘；
 * - 指令定义（`findDirectiveCaps`）：真正落盘的版本，最准，读一次缓存 10 s。
 */

interface Caps {
  hasCron: boolean
  hasWatch: boolean
}

interface SummaryLike {
  has_cron?: boolean
  has_watch?: boolean
  trigger_count?: number
}

const CAPS_CACHE_MS = 10_000

const CAPS_CACHE = new Map<string, { at: number; caps: Caps }>()

function triggerKind(trigger: { type?: string }): string {
  return typeof trigger.type === 'string' ? trigger.type.trim().toLowerCase() : ''
}

/** 从 triggers 算出菜单能力；编辑器草稿用 */
function capsFromTriggers(triggers: Array<{ type?: string }> | undefined): Caps {
  const items = triggers ?? []
  return {
    hasCron: items.some(function (trigger) {
      return triggerKind(trigger) === 'cron'
    }),
    hasWatch: items.some(function (trigger) {
      return triggerKind(trigger) === 'watch'
    })
  }
}

/**
 * 墙面卡片摘要 → 运行能力。
 *
 * 新 daemon 带 `has_cron` / `has_watch`；旧进程没有时落成 false，
 * 但 `trigger_count` 仍可靠——有触发器却分不清种类时先都放开，挂载后再读定义收窄。
 */
function capsFromSummary(summary: SummaryLike | null | undefined): Caps {
  if (!summary) return { hasCron: false, hasWatch: false }
  const hasCron = summary.has_cron === true
  const hasWatch = summary.has_watch === true
  if (!hasCron && !hasWatch && (summary.trigger_count ?? 0) > 0) {
    return { hasCron: true, hasWatch: true }
  }
  return { hasCron, hasWatch }
}

/** 读指令定义算能力（带 10 s 缓存） */
async function findDirectiveCaps(name: string): Promise<Caps> {
  const now = Date.now()
  const hit = CAPS_CACHE.get(name)
  if (hit && now - hit.at < CAPS_CACHE_MS) return hit.caps
  try {
    const document = await itc.sidecar.directive({ name })
    const caps = capsFromTriggers(document.definition.triggers)
    CAPS_CACHE.set(name, { at: now, caps })
    return caps
  } catch (error) {
    // 指令文件可能刚被编辑器改写/删除：本轮拿不到能力就沿缓存或全开放
    console.warn('[run-caps] 读取指令定义失败', name, error)
    return hit?.caps ?? { hasCron: true, hasWatch: true }
  }
}

export { capsFromSummary, capsFromTriggers, findDirectiveCaps }
export type { Caps, SummaryLike }
