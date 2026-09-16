import { useAuiState } from '@assistant-ui/react'
import { useMemo } from 'react'

import { useActiveWorkspaceID, useWorkspaces } from '@/features/agent/workspace/client.ts'

/**
 * 左栏的任务分组：按**工作区**归拢会话（对齐 Qoder 的「一个项目一撮任务」）。
 *
 * 不复用设计包的 `useThreadListGroups`：它按时间分（今天/昨天/更早），
 * 而这里要的是归属维度。两者取的数据源相同（`threads.threadIds` + 条目的
 * `custom.workspaceID`），所以只是分组策略不同，不是两套列表。
 */

/** 没绑定工作区的会话归到这一组；名字要说清它们缺什么，而不是含糊的「其他」 */
const UNBOUND_GROUP_ID = '__unbound__'
const UNBOUND_GROUP_LABEL = '未关联工作区'
const UNTITLED_LABEL = '未命名任务'

interface ThreadGroup {
  id: string
  label: string
  indices: number[]
}

interface ThreadEntry {
  /** 在 `threadIds` 里的下标 —— `ThreadListPrimitive.ItemByIndex` 要的就是它 */
  index: number
  title: string
  workspaceID: string | null
}

/**
 * 组顺序：当前工作区 → 其余工作区（按列表顺序）→ 未关联。空组不出现。
 *
 * 组内保持传入顺序：runtime 给的已是「置顶优先 + 最近活动在前」，
 * 这里再排一次会把置顶打乱。
 */
function groupThreadsByWorkspace(
  entries: readonly ThreadEntry[],
  workspaces: readonly { id: string; title: string }[],
  activeWorkspaceID: string | null
): ThreadGroup[] {
  const labelByID = new Map<string, string>()
  for (const item of workspaces) labelByID.set(item.id, item.title)

  const groups = new Map<string, ThreadGroup>()
  for (const entry of entries) {
    // 工作区已被移除的会话按未关联算：列表里已经没有它的位置了
    const id =
      entry.workspaceID && labelByID.has(entry.workspaceID)
        ? entry.workspaceID
        : UNBOUND_GROUP_ID
    const existing = groups.get(id)
    if (existing) {
      existing.indices.push(entry.index)
      continue
    }
    groups.set(id, {
      id,
      label: id === UNBOUND_GROUP_ID ? UNBOUND_GROUP_LABEL : (labelByID.get(id) ?? id),
      indices: [entry.index]
    })
  }

  const ordered: ThreadGroup[] = []
  function pushIfPresent(id: string) {
    const group = groups.get(id)
    if (group) ordered.push(group)
  }

  if (activeWorkspaceID) pushIfPresent(activeWorkspaceID)
  for (const item of workspaces) {
    if (item.id !== activeWorkspaceID) pushIfPresent(item.id)
  }
  pushIfPresent(UNBOUND_GROUP_ID)

  return ordered
}

/** @deprecated 用 `groupThreadsByWorkspace` */
function groupThreadsByRoot(
  entries: readonly ThreadEntry[],
  workspaces: readonly { id: string; title: string }[],
  activeWorkspaceID: string | null
): ThreadGroup[] {
  return groupThreadsByWorkspace(entries, workspaces, activeWorkspaceID)
}

/** 搜索只过滤标题；命中的条目再分组 —— 分组是视图，不该影响「搜得到」 */
function useWorkspaceThreadGroups(searchQuery: string) {
  const threadIds = useAuiState(function (state) {
    return state.threads.threadIds
  })
  const threadItems = useAuiState(function (state) {
    return state.threads.threadItems
  })
  const workspaces = useWorkspaces()
  const activeWorkspaceID = useActiveWorkspaceID()
  const query = searchQuery.trim().toLowerCase()
  const workspaceRows = workspaces.data

  return useMemo(
    function () {
      const itemsById = new Map(
        threadItems.map(function (item) {
          return [item.id, item] as const
        })
      )

      const entries: ThreadEntry[] = []
      for (const [index, id] of threadIds.entries()) {
        const item = itemsById.get(id)
        const title = item?.title || UNTITLED_LABEL
        if (query && !title.toLowerCase().includes(query)) continue

        const workspaceID = item?.custom?.workspaceID
        entries.push({
          index,
          title,
          workspaceID: typeof workspaceID === 'string' ? workspaceID : null
        })
      }

      return {
        threadIds,
        indices: entries.map(function (entry) {
          return entry.index
        }),
        groups: groupThreadsByWorkspace(entries, workspaceRows ?? [], activeWorkspaceID)
      }
    },
    [threadIds, threadItems, query, workspaceRows, activeWorkspaceID]
  )
}

export {
  UNBOUND_GROUP_ID,
  UNBOUND_GROUP_LABEL,
  UNTITLED_LABEL,
  groupThreadsByRoot,
  groupThreadsByWorkspace,
  useWorkspaceThreadGroups
}
export type { ThreadGroup, ThreadEntry }
