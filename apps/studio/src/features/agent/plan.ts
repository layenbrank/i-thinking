import type { ThreadMessage } from '@assistant-ui/react'

/**
 * 计划快照：从对话里捞出**最后一次** `todo_write` 的工具结果。
 *
 * 为什么不另建一份「计划 store」：工具结果本身已经随消息落库，
 * 再从消息里派生一次，刷新/切会话/重放历史都是天然一致的 ——
 * 存两份必然要在「谁是真源」上打架。
 *
 * 也不让用户在这里勾选：计划由模型整份覆盖，本地改动会被下一次调用抹掉，
 * 给一个点了没用的勾选框不如不给。
 */

const PLAN_TOOL_NAME = 'todo_write'

type PlanStatus = 'pending' | 'in_progress' | 'completed'

interface PlanItem {
  id: string
  text: string
  status: PlanStatus
}

interface PlanSnapshot {
  items: PlanItem[]
  /** 已完成条数 */
  done: number
  total: number
}

function isPlanStatus(value: unknown): value is PlanStatus {
  return value === 'pending' || value === 'in_progress' || value === 'completed'
}

/** 工具结果不是契约里的形状时返回 null —— 宁可让面板空着，也不要渲染半截数据 */
function parsePlanItems(result: unknown): PlanItem[] | null {
  if (!result || typeof result !== 'object') return null

  const record = result as Record<string, unknown>
  if (record.ok !== true || !Array.isArray(record.items)) return null

  const items: PlanItem[] = []
  for (const [index, raw] of record.items.entries()) {
    if (!raw || typeof raw !== 'object') continue
    const entry = raw as Record<string, unknown>
    const text = typeof entry.text === 'string' ? entry.text.trim() : ''
    if (!text) continue
    items.push({
      id: typeof entry.id === 'string' ? entry.id : `todo-${index + 1}`,
      text,
      status: isPlanStatus(entry.status) ? entry.status : 'pending'
    })
  }

  return items.length > 0 ? items : null
}

function findLatestPlan(messages: readonly ThreadMessage[]): PlanSnapshot | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const parts = messages[messageIndex].content

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]
      if (part.type !== 'tool-call' || part.toolName !== PLAN_TOOL_NAME) continue
      if (part.result === undefined) continue

      const items = parsePlanItems(part.result)
      if (!items) return null

      return {
        items,
        done: items.filter(function (item) {
          return item.status === 'completed'
        }).length,
        total: items.length
      }
    }
  }

  return null
}

export { PLAN_TOOL_NAME, parsePlanItems, findLatestPlan }
export type { PlanItem, PlanSnapshot, PlanStatus }
