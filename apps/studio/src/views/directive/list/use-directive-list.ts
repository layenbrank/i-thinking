import { useMemo, useState } from 'react'

import { useCorexStore } from '@/stores/corex'

import { findFreeName } from '../draft'
import { indexLastRuns, indexRunSummaries } from '../run/run-status'
import { useNow } from '../use-now'
import { type SortMode, findSortMode, groupDirectives, writeSortMode } from './group'
import type { PlaceholderState } from './placeholder'

/**
 * 指令列表那份状态：过滤、排序、分组、运行概览。
 *
 * 两处呈现（整页的卡片墙、编排台的左栏）差别只在摆法与宽窄，取数必须走同一套 ——
 * 各算各的话，「同一个搜索词在两边搜出来的条数不一样」这类毛病没法查。
 */

/** 相对时间按分钟级刷新就够，不必像任务耗时那样每 500ms 走一次 */
const CLOCK_MS = 30_000

function useDirectiveList() {
  const directives = useCorexStore(function (state) {
    return state.directives
  })
  const catalog = useCorexStore(function (state) {
    return state.catalog
  })
  const runs = useCorexStore(function (state) {
    return state.runs
  })
  const seenAt = useCorexStore(function (state) {
    return state.seenAt
  })
  const isLoaded = useCorexStore(function (state) {
    return state.isLoaded
  })
  const isLoading = useCorexStore(function (state) {
    return state.isLoading
  })
  const loadError = useCorexStore(function (state) {
    return state.loadError
  })

  const [query, updateQuery] = useState('')
  const [sortMode, updateSortMode] = useState(findSortMode)

  /** corex 账本里的「上次运行」，本会话跑过的那些以实时记录为准（见 `indexRunSummaries`） */
  const lastRuns = useMemo(
    function () {
      return indexLastRuns(directives)
    },
    [directives]
  )

  const summaries = useMemo(
    function () {
      return indexRunSummaries(runs, seenAt, lastRuns)
    },
    [runs, seenAt, lastRuns]
  )

  // 有卡片在显示「最近执行」就得走时钟；一条都没跑过时不必空转
  const isClockOn = runs.length > 0 || Object.keys(lastRuns).length > 0
  const now = useNow(CLOCK_MS, isClockOn)

  const matched = useMemo(
    function () {
      const keyword = query.trim().toLowerCase()
      if (!keyword) return directives
      return directives.filter(function (entry) {
        return (
          entry.name.toLowerCase().includes(keyword) ||
          (entry.summary?.description ?? '').toLowerCase().includes(keyword)
        )
      })
    },
    [directives, query]
  )

  const groups = useMemo(
    function () {
      return groupDirectives(matched, summaries, sortMode, now)
    },
    [matched, summaries, sortMode, now]
  )

  const unread = useMemo(
    function () {
      return directives.reduce<string[]>(function (names, entry) {
        if (summaries[entry.name]?.hasUnread) names.push(entry.name)
        return names
      }, [])
    },
    [directives, summaries]
  )

  const shown = groups.reduce(function (total, group) {
    return total + group.items.length
  }, 0)

  /** 没东西可显示时属于哪种情形；卡片墙与左栏都拿这一份判断，别各自推一遍 */
  const state: PlaceholderState = loadError
    ? 'error'
    : !isLoaded
      ? 'loading'
      : query.trim().length > 0
        ? 'no-match'
        : 'empty'

  function handleSort(next: SortMode) {
    updateSortMode(next)
    writeSortMode(next)
  }

  /** 新指令先起个没被占用的名字：编辑器的骨架与「未保存」状态都由名字是否已存在推出来 */
  function findNewName(): string {
    return findFreeName(
      directives.map(function (entry) {
        return entry.name
      })
    )
  }

  /** 目录没读进来时给界面的重试入口；读成功过就什么都不做（store 挡着） */
  function retry() {
    void useCorexStore.getState().initialize()
  }

  return {
    catalog,
    directives,
    groups,
    isLoaded,
    isLoading,
    loadError,
    isSearching: query.trim().length > 0,
    now,
    query,
    shown,
    sortMode,
    state,
    summaries,
    unread,
    findNewName,
    handleSort,
    retry,
    updateQuery
  }
}

export { useDirectiveList }
