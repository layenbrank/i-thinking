import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { useAgentStore } from '@/stores/agent.ts'

/**
 * 工作区的渲染侧入口。
 *
 * 增删改一律走主进程（`itc.workspace.*`）；本地只缓存列表与「当前工作区」指针。
 * 指针是 agent 域的运行态（`stores/agent.ts`），持久化只是为了让重开窗口能接着用。
 */

export type Workspace = Awaited<ReturnType<typeof itc.workspace.toRead>>[number]
export type DirEntry = Awaited<ReturnType<typeof itc.workspace.listDir>>[number]
export type SearchHit = Awaited<ReturnType<typeof itc.workspace.search>>[number]

/** 给文件选择器等仍读 `.path` 的调用方：primaryPath 的别名 */
export type ActiveWorkspace = Workspace & { path: string | null }

const WORKSPACES_KEY = ['workspace', 'list'] as const

function findFolderTitle(folderPath: string): string {
  const normalized = folderPath.replace(/[/\\]+$/, '')
  const parts = normalized.split(/[/\\]/)
  return parts[parts.length - 1] || folderPath
}

export function useWorkspaces() {
  return useQuery({
    queryKey: WORKSPACES_KEY,
    queryFn: function () {
      return itc.workspace.toRead()
    }
  })
}

/**
 * 已归档的工作区（侧栏「已归档」分区）。
 *
 * 与主列表同一个 IPC（`includeArchived`），但列表本身已经把归档项滤掉了 ——
 * 所以必须**另开一个 query**：主列表的开合、指针回落都不该看见归档项，
 * 而归档区是显式展开的次要视图。键以 `WORKSPACES_KEY` 开头，
 * 归档 / 恢复后的 `invalidateQueries` 一次刷两处。
 */
export function useArchivedWorkspaces() {
  return useQuery({
    queryKey: [...WORKSPACES_KEY, 'archived'] as const,
    queryFn: async function () {
      const rows = await itc.workspace.toRead({ includeArchived: true })
      return rows.filter(function (item) {
        return item.archived
      })
    }
  })
}

/** @deprecated 用 `useWorkspaces` */
export function useWorkspaceRoots() {
  return useWorkspaces()
}

export function useActiveWorkspace(): ActiveWorkspace | null {
  const workspaces = useWorkspaces()
  const activeWorkspaceID = useActiveWorkspaceID()

  const row =
    workspaces.data?.find(function (item) {
      return item.id === activeWorkspaceID
    }) ?? null

  if (!row) return null
  return { ...row, path: row.primaryPath }
}

/** @deprecated 用 `useActiveWorkspace`；`.path` 映射自 primaryPath */
export function useActiveRoot(): ActiveWorkspace | null {
  return useActiveWorkspace()
}

/**
 * 当前工作区 id：已删 / 未选时回落到第一个，保证「有区可用」与列表一致。
 *
 * 回落结果会**写回 agent 存储**：这个指针不只给界面看 —— 新建会话的归属
 * （`workspaceID`）与端口层的 host options 都从那里读。
 */
export function useActiveWorkspaceID(): string | null {
  const workspaces = useWorkspaces()
  const activeWorkspaceID = useAgentStore(function (state) {
    return state.settings.workspace.activeWorkspaceID
  })
  const update = useAgentStore(function (state) {
    return state.update
  })

  const exists =
    activeWorkspaceID !== null &&
    Boolean(
      workspaces.data?.some(function (item) {
        return item.id === activeWorkspaceID
      })
    )
  const resolved = exists ? activeWorkspaceID : (workspaces.data?.[0]?.id ?? null)

  useEffect(
    function () {
      if (!resolved || resolved === activeWorkspaceID) return
      void update('workspace', { activeWorkspaceID: resolved })
    },
    [resolved, activeWorkspaceID, update]
  )

  return resolved
}

/** @deprecated 用 `useActiveWorkspaceID` */
export function useActiveRootID(): string | null {
  return useActiveWorkspaceID()
}

export function useWorkspaceActions() {
  const client = useQueryClient()
  const update = useAgentStore(function (state) {
    return state.update
  })

  const addWorkspace = useMutation({
    mutationFn: async function () {
      const picked = await itc.dialog.open({ directory: true })
      if (!picked || picked.length === 0) return null
      const folderPath = picked[0]
      return itc.workspace.toWrite({
        title: findFolderTitle(folderPath),
        folders: [{ path: folderPath, isPrimary: true }]
      })
    },
    onSuccess: async function (row) {
      await client.invalidateQueries({ queryKey: WORKSPACES_KEY })
      if (row) await update('workspace', { activeWorkspaceID: row.id })
    }
  })

  const removeWorkspace = useMutation({
    mutationFn: function (id: string) {
      return itc.workspace.toRemove({ id })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: WORKSPACES_KEY })
    }
  })

  const selectWorkspace = useMutation({
    mutationFn: function (id: string) {
      return update('workspace', { activeWorkspaceID: id })
    }
  })

  /** 固定：只动 `pinned`，不碰归档状态（同一条 `workspace:update`） */
  const pinWorkspace = useMutation({
    mutationFn: function (input: { id: string; pinned: boolean }) {
      return itc.workspace.toUpdate({ id: input.id, pinned: input.pinned })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: WORKSPACES_KEY })
    }
  })

  /** 归档：`workspace:archive` 是单向的；取消归档走 `workspace:update` 的 `archived: false` */
  const archiveWorkspace = useMutation({
    mutationFn: function (id: string) {
      return itc.workspace.toArchive({ id })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: WORKSPACES_KEY })
    }
  })

  const restoreWorkspace = useMutation({
    mutationFn: function (id: string) {
      return itc.workspace.toUpdate({ id, archived: false })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: WORKSPACES_KEY })
    }
  })

  return {
    addWorkspace,
    removeWorkspace,
    selectWorkspace,
    pinWorkspace,
    archiveWorkspace,
    restoreWorkspace,
    /** @deprecated */
    addRoot: addWorkspace,
    /** @deprecated */
    removeRoot: removeWorkspace,
    /** @deprecated */
    selectRoot: selectWorkspace
  }
}

/** 目录列举 / 搜索 / 读文件（附件与 @ 引用用；primary 根内相对路径） */
export function useDirEntries(workspaceID: string | null, relative = '') {
  return useQuery({
    queryKey: ['workspace', 'listDir', workspaceID, relative],
    queryFn: function () {
      return itc.workspace.listDir({
        workspaceID: workspaceID as string,
        ...(relative ? { relative } : {})
      })
    },
    enabled: Boolean(workspaceID)
  })
}

export function useWorkspaceSearch(workspaceID: string | null, query: string) {
  const trimmed = query.trim()

  return useQuery({
    queryKey: ['workspace', 'search', workspaceID, trimmed],
    queryFn: function () {
      return itc.workspace.search({ workspaceID: workspaceID as string, query: trimmed })
    },
    enabled: Boolean(workspaceID) && trimmed.length > 0
  })
}

export function readWorkspaceFile(workspaceID: string, relative: string) {
  return itc.workspace.readFile({ workspaceID, relative })
}
