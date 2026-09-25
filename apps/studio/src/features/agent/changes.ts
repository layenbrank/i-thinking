import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'

import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * 本会话的文件变更（opencode 的 `session.diff`，主进程转发；**不是** git status）。
 *
 * 右栏的变更清单与消息流里的汇总卡是同一份数据的两个面，所以查询与撤销都收在这里，
 * 共用同一个查询键 —— 两处各写一份必然出现「一边点撤销、另一边还显示旧数字」。
 */

/** 会话还没落库（首轮对话进行中）时读不到 diff，两个钩子的入口都先过这道关 */
function requireSessionID(sessionID: string | null): string {
  if (sessionID === null) throw new Error('会话尚未落库，无法读写变更')
  return sessionID
}

function toChangesKey(sessionID: string | null): readonly unknown[] {
  return ['workspace', 'changes', sessionID]
}

/** 运行中轮询：agent 边改边看，间隔与工具卡刷新节奏一致 */
const CHANGES_REFRESH_MS = 1_200

/**
 * 运行结束补一次。
 *
 * 轮询只在运行中开，最后一次写入可能落在最后一次轮询之后（agent 常常是「写完就收尾」），
 * 停在那一拍上清单就少一个文件。只在 true → false 的边沿触发：挂载时不发请求。
 */
function useRefreshOnRunEnd(isRunning: boolean, refresh: () => void): void {
  const wasRunning = useRef(false)

  useEffect(
    function () {
      if (isRunning) {
        wasRunning.current = true
        return
      }
      if (!wasRunning.current) return

      wasRunning.current = false
      refresh()
    },
    [isRunning, refresh]
  )
}

function useSessionChanges(sessionID: string | null, isRunning: boolean) {
  const query = useQuery({
    queryKey: toChangesKey(sessionID),
    queryFn: function () {
      return itc.workspace.changes.toRead({ sessionID: requireSessionID(sessionID) })
    },
    enabled: sessionID !== null,
    refetchInterval: isRunning && sessionID !== null ? CHANGES_REFRESH_MS : false
  })

  // `refetch` 身份稳定，这个 effect 不会因为每次渲染而重跑
  useRefreshOnRunEnd(isRunning && sessionID !== null, query.refetch)

  return query
}

/** 撤销单个文件（不给 changeID 即撤销全部），成功后刷新共享的变更查询 */
function useUndoChanges(sessionID: string | null) {
  const client = useQueryClient()

  return useMutation({
    mutationFn: function (changeID?: string) {
      return itc.workspace.changes.toUndo({
        sessionID: requireSessionID(sessionID),
        ...(changeID ? { changeID } : {})
      })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: toChangesKey(sessionID) })
      toast.success('已撤销变更')
    },
    onError: function (error) {
      toast.error(toIpcMessage(error, '撤销失败'))
    }
  })
}

function toPatchKey(sessionID: string | null, changeID: string): readonly unknown[] {
  return ['workspace', 'changes', sessionID, 'patch', changeID]
}

/**
 * 单个文件的 diff 正文。**按需**拉取：变更清单是 1.2s 一轮的轮询，
 * 而一个文件的 patch 可能几十万字符，塞进清单会让每轮都白搬一遍。
 *
 * 展开过的文件会被缓存住，同时以 `staleTime` 兜底 —— 文件可能被后续 step 再改，
 * 但展开期间每 1.2s 重拉正文没有意义。
 */
function useChangePatch(sessionID: string | null, changeID: string, enabled: boolean) {
  return useQuery({
    queryKey: toPatchKey(sessionID, changeID),
    queryFn: function () {
      return itc.workspace.changes.toPatch({
        sessionID: requireSessionID(sessionID),
        changeID
      })
    },
    enabled: enabled && sessionID !== null,
    staleTime: 30_000
  })
}

export { toChangesKey, toPatchKey, useChangePatch, useSessionChanges, useUndoChanges }
