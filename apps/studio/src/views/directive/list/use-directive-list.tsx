import { useCallback, useMemo, useState } from 'react'
import { toast } from 'sonner'

import type { ImportResult } from '@/shared/ipc/specs/sidecar'
import { useCorexStore } from '@/stores/corex'

import { findFreeName } from '@/views/directive/draft'
import { indexLastRuns, indexRunSummaries } from '@/views/directive/run/run-status'
import { useNow } from '@/views/directive/use-now'
import { DirectiveDeleteDialog } from './delete-confirm-dialog'
import { type SortMode, findSortMode, groupDirectives, writeSortMode } from './group'
import {
  ImportOverwriteDialog,
  type OverwritePrompt
} from './import-overwrite-dialog'
import type { PlaceholderState } from './placeholder'

/**
 * 指令列表那份状态：过滤、排序、分组、运行概览。
 *
 * 两处呈现（整页的卡片墙、编排台的左栏）差别只在摆法与宽窄，取数必须走同一套 ——
 * 各算各的话，「同一个搜索词在两边搜出来的条数不一样」这类毛病没法查。
 */

/** 相对时间按分钟级刷新就够，不必像任务耗时那样每 500ms 走一次 */
const CLOCK_MS = 30_000

/** 把导入结果说清楚：四个数 + 失败文件逐条；然后刷新列表 */
async function finishImport(result: ImportResult) {
  toast.success('导入完成', {
    description: `新增 ${result.created} · 更新 ${result.updated} · 跳过 ${result.skipped} · 失败 ${result.failed}`
  })
  const failures = result.entries.filter(function (entry) {
    return entry.status === 'failed'
  })
  if (failures.length > 0) {
    toast.error(`${failures.length} 个文件没能导入`, {
      description: failures
        .map(function (entry) {
          return `${entry.name}：${entry.error ?? '原因未知'}`
        })
        .join('\n')
    })
  }
  await useCorexStore.getState().refreshDirectives()
}

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
  const [overwritePrompt, updateOverwritePrompt] = useState<OverwritePrompt | null>(null)
  const [pendingDelete, updatePendingDelete] = useState<string | null>(null)
  const [isDeleting, updateDeleting] = useState(false)

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

  async function applyImport(path: string, isOverwrite: boolean) {
    try {
      const result = await useCorexStore.getState().importDirectives({
        path,
        is_overwrite: isOverwrite
      })
      await finishImport(result)
    } catch (error) {
      console.error('[directive] 导入指令失败', error)
      toast.error('导入失败', {
        description: error instanceof Error ? error.message : String(error)
      })
    }
  }

  /**
   * 导入 YAML：先选目录或文件，再 dry_run 扫同名。
   *
   * 有同名就弹确认（跳过 / 覆盖 / 取消）；没有冲突直接落库。
   * 结果用 toast 报四个数，失败文件逐个列出来。
   */
  async function importFrom(kind: 'dir' | 'file') {
    let picked: string[] | null
    try {
      picked = await itc.dialog.open(
        kind === 'dir'
          ? { directory: true }
          : { filters: [{ name: 'YAML', extensions: ['yaml', 'yml'] }] }
      )
    } catch (error) {
      console.error('[directive] 打开选择框失败', error)
      toast.error('没能打开选择框', {
        description: error instanceof Error ? error.message : String(error)
      })
      return
    }

    const path = picked?.[0]
    if (!path) return

    let preview: ImportResult
    try {
      preview = await useCorexStore.getState().importDirectives({
        path,
        is_dry_run: true
      })
    } catch (error) {
      console.error('[directive] 预检导入失败', error)
      toast.error('导入预检失败', {
        description: error instanceof Error ? error.message : String(error)
      })
      return
    }

    const skippedNames = preview.entries
      .filter(function (entry) {
        return entry.status === 'skipped'
      })
      .map(function (entry) {
        return entry.name
      })

    if (skippedNames.length > 0) {
      updateOverwritePrompt({ path, names: skippedNames })
      return
    }

    await applyImport(path, false)
  }

  function clearOverwritePrompt() {
    updateOverwritePrompt(null)
  }

  function confirmSkip(path: string) {
    clearOverwritePrompt()
    void applyImport(path, false)
  }

  function confirmOverwrite(path: string) {
    clearOverwritePrompt()
    void applyImport(path, true)
  }

  const importDialog = (
    <ImportOverwriteDialog
      prompt={overwritePrompt}
      onCancel={clearOverwritePrompt}
      onSkip={confirmSkip}
      onOverwrite={confirmOverwrite}
    />
  )

  const requestDelete = useCallback(function (name: string) {
    updatePendingDelete(name)
  }, [])

  function clearPendingDelete() {
    if (isDeleting) return
    updatePendingDelete(null)
  }

  async function confirmDelete() {
    const target = pendingDelete
    if (!target || isDeleting) return
    updateDeleting(true)
    try {
      await useCorexStore.getState().deleteDirective(target)
      await useCorexStore.getState().refreshDirectives()
      toast.success(`已删除指令 ${target}`)
      updatePendingDelete(null)
    } catch (error) {
      console.error('[directive] 删除指令失败', error)
      toast.error('删除失败', {
        description: error instanceof Error ? error.message : String(error)
      })
    } finally {
      updateDeleting(false)
    }
  }

  const deleteDialog = (
    <DirectiveDeleteDialog
      name={pendingDelete}
      isDeleting={isDeleting}
      onCancel={clearPendingDelete}
      onConfirm={function () {
        void confirmDelete()
      }}
    />
  )

  return {
    catalog,
    directives,
    groups,
    importDialog,
    deleteDialog,
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
    importFrom,
    requestDelete,
    retry,
    updateQuery
  }
}

export { useDirectiveList }
