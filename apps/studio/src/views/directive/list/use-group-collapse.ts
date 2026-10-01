import { useEffect, useState } from 'react'

import type { DirectiveGroup } from './types'

/**
 * 分组折叠：按 key 记开合。切排序时重算默认 —— 「未运行」特别多且旁边已有
 * 最近跑过的组时，默认收起，免得把刚在弄的那几条顶出视口。
 */

const NEVER_KEY = 'never'
const NEVER_AUTO_COLLAPSE = 12

interface CollapseState {
  mode: string
  openMap: Record<string, boolean>
}

function seedOpen(groups: readonly DirectiveGroup[]): Record<string, boolean> {
  const hasPeers = groups.length > 1
  const open: Record<string, boolean> = {}
  groups.forEach(function (group) {
    const collapseNever =
      group.key === NEVER_KEY && hasPeers && group.items.length > NEVER_AUTO_COLLAPSE
    open[group.key] = !collapseNever
  })
  return open
}

function mergeOpen(
  prev: Record<string, boolean>,
  groups: readonly DirectiveGroup[]
): Record<string, boolean> {
  const next = { ...prev }
  let changed = false
  const hasPeers = groups.length > 1
  groups.forEach(function (group) {
    if (group.key in next) return
    const collapseNever =
      group.key === NEVER_KEY && hasPeers && group.items.length > NEVER_AUTO_COLLAPSE
    next[group.key] = !collapseNever
    changed = true
  })
  return changed ? next : prev
}

function isCollapseState(value: unknown): value is CollapseState {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.mode === 'string' && !!record.openMap && typeof record.openMap === 'object'
}

function useGroupCollapse(groups: readonly DirectiveGroup[], sortMode: string) {
  const [state, updateState] = useState<CollapseState>(function () {
    return { mode: sortMode, openMap: seedOpen(groups) }
  })

  // HMR / 旧形态 state 没有 openMap 时当场归一；切排序也在这里重播种。
  // 算出本轮要用的值再 setState，避免「先读坏 state 再等下一帧」的空窗。
  let current = state
  if (!isCollapseState(state) || state.mode !== sortMode) {
    current = { mode: sortMode, openMap: seedOpen(groups) }
    updateState(current)
  }

  useEffect(
    function () {
      updateState(function (prev) {
        const base = isCollapseState(prev) ? prev : { mode: sortMode, openMap: seedOpen(groups) }
        const openMap = mergeOpen(base.openMap, groups)
        if (openMap === base.openMap && isCollapseState(prev)) return prev
        return { mode: base.mode, openMap }
      })
    },
    [groups, sortMode]
  )

  function isOpen(key: string): boolean {
    return current.openMap[key] ?? true
  }

  function updateOpen(key: string, open: boolean) {
    updateState(function (prev) {
      const base = isCollapseState(prev) ? prev : { mode: sortMode, openMap: seedOpen(groups) }
      if (base.openMap[key] === open) return base
      return { ...base, openMap: { ...base.openMap, [key]: open } }
    })
  }

  return { isOpen, updateOpen }
}

export { NEVER_AUTO_COLLAPSE, seedOpen, useGroupCollapse }
