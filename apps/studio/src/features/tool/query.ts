import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

/**
 * 在线工具（pandoc / ffmpeg / opencode）的读取与安装。
 *
 * 状态只能问主进程：落点 `<userData>/sidecar/…` 在渲染进程看不见，内置的那份更是只在打包目录里。
 * 下载是几十秒到几分钟的事，进度由 `tool:progress` 推回来 —— 没有进度用户只能干等。
 */

type ToolRow = Awaited<ReturnType<typeof itc.tool.toRead>>[number]
type ToolProgress = Parameters<Parameters<typeof itc.tool.onProgress>[0]>[0]

/** 工具标识是**键**（`pandoc` / `ffmpeg` / `opencode`），不是数据库 id：契约里就是枚举 */
type ToolKey = ToolRow['key']

const TOOLS_KEY = ['tool', 'list'] as const

function useTools() {
  return useQuery({ queryKey: TOOLS_KEY, queryFn: findTools, staleTime: 30_000 })
}

function findTools(): Promise<ToolRow[]> {
  return itc.tool.toRead()
}

function useInstallTool() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: function (key: ToolKey) {
      return itc.tool.install({ key })
    },
    onSuccess: function () {
      void client.invalidateQueries({ queryKey: TOOLS_KEY })
    }
  })
}

function useRemoveTool() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: function (key: ToolKey) {
      return itc.tool.toRemove({ key })
    },
    onSuccess: function () {
      void client.invalidateQueries({ queryKey: TOOLS_KEY })
    }
  })
}

/**
 * 订阅安装进度，没有在装时为 null。
 *
 * 解压那一帧不显示：它只有「开始解压」这一个状态，而解压很快，闪一下反而像卡住。
 */
function useToolProgress() {
  const [progress, setProgress] = useState<ToolProgress | null>(null)

  useEffect(function () {
    return itc.tool.onProgress(function (next) {
      setProgress(next.phase === 'extract' ? null : next)
    })
  }, [])

  return progress
}

export { TOOLS_KEY, useInstallTool, useRemoveTool, useToolProgress, useTools }
export type { ToolKey, ToolProgress, ToolRow }
