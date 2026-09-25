import type { ThreadMessage } from '@assistant-ui/react'

/**
 * 计划快照：从助手的回答正文里捞出**最后一份** markdown 任务清单。
 *
 * 为什么不从工具入参捞：v2 没有待办工具（`shared/agent-tools.ts` 记着实测结论），
 * 计划由模型写在回答正文里（`- [ ]` / `- [x]`）。这里曾按 v1 的 `todowrite` 入参解析，
 * 而那个工具名在 v2 里不存在，于是面板永远是空的。
 *
 * 为什么不另建一份「计划 store」：正文本身已经随消息落库，从这里派生一次，
 * 刷新 / 切会话 / 重放历史都是天然一致的 —— 存两份必然要在「谁是真源」上打架。
 *
 * 也不让用户在这里勾选：计划由模型整份覆盖，本地改动会被下一次回答抹掉，
 * 给一个点了没用的勾选框不如不给。
 *
 * 状态只有两态：markdown 表达不了「进行中」，数据源给不出就不留空壳状态
 * （三态随 v1 的 `todowrite` 一起消失）。
 */

/** markdown 任务行：`- [ ] 文本` / `* [x] 文本`（`+` 也是合法列表符） */
const TASK_LINE = /^[ \t]*[-*+][ \t]+\[([ xX])\][ \t]+(.+?)[ \t]*$/

type PlanStatus = 'pending' | 'completed'

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

/**
 * 捞一段 markdown 里的任务行。内容来自模型，不做 markdown 语法树解析：
 * 认得出任务行就用，认不出（没有任务行）就返回 null，不吐半截数据给面板。
 */
function parsePlanItems(text: string): PlanItem[] | null {
  const items: PlanItem[] = []

  for (const line of text.split('\n')) {
    const match = TASK_LINE.exec(line)
    if (!match) continue

    const label = match[2].trim()
    if (!label) continue

    items.push({
      id: `todo-${items.length + 1}`,
      text: label,
      status: match[1] === ' ' ? 'pending' : 'completed'
    })
  }

  return items.length > 0 ? items : null
}

function toSnapshot(items: PlanItem[]): PlanSnapshot {
  return {
    items,
    done: items.filter(function (item) {
      return item.status === 'completed'
    }).length,
    total: items.length
  }
}

function findLatestPlan(messages: readonly ThreadMessage[]): PlanSnapshot | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex]
    if (message.role !== 'assistant') continue

    const parts = message.content
    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex]
      if (part.type !== 'text') continue

      // 模型整份重写计划，所以取最后一段带任务行的正文；还没写完的正文捞不到就往前找
      const items = parsePlanItems(part.text)
      if (items) return toSnapshot(items)
    }
  }

  return null
}

export { parsePlanItems, findLatestPlan }
export type { PlanItem, PlanSnapshot, PlanStatus }
