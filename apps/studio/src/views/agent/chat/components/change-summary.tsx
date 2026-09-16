import { useAuiState } from '@assistant-ui/react'
import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  FilePenLineIcon,
  RotateCcwIcon,
  ScanSearchIcon
} from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * 本会话 `fs_write` 变更汇总（对齐 Qoder「已编辑 N 个文件」卡）。
 * 数据来自主进程 change journal，不靠 git status。
 */
export function ChangeSummary() {
  const sessionID = useAuiState(function (state) {
    return state.threads.mainThreadId
  })
  const isRunning = useAuiState(function (state) {
    return state.thread.isRunning
  })
  const [isReviewOpen, updateReviewOpen] = useState(false)
  const client = useQueryClient()

  const changes = useQuery({
    queryKey: ['workspace', 'changes', sessionID],
    queryFn: function () {
      return itc.workspace.changes.toRead({ sessionID })
    },
    enabled: Boolean(sessionID),
    refetchInterval: isRunning ? 1_200 : false
  })

  const undo = useMutation({
    mutationFn: function (changeID?: string) {
      return itc.workspace.changes.toUndo({
        sessionID,
        ...(changeID ? { changeID } : {})
      })
    },
    onSuccess: async function () {
      await client.invalidateQueries({ queryKey: ['workspace', 'changes', sessionID] })
      toast.success('已撤销变更')
    },
    onError: function (error) {
      toast.error(toIpcMessage(error, '撤销失败'))
    }
  })

  const entries = changes.data?.entries ?? []
  if (entries.length === 0) return null

  const added = changes.data?.added ?? 0
  const removed = changes.data?.removed ?? 0

  return (
    <div className="border-border bg-card mb-2 overflow-hidden rounded-lg border shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2">
        <FilePenLineIcon className="text-muted-foreground size-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">已编辑 {entries.length} 个文件</p>
          <p className="text-muted-foreground flex items-center gap-2 text-xs">
            <Badge
              variant="outline"
              className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
              +{added}
            </Badge>
            <Badge
              variant="outline"
              className="border-rose-500/40 text-rose-600 dark:text-rose-400">
              −{removed}
            </Badge>
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={undo.isPending}
          onClick={function () {
            undo.mutate(undefined)
          }}>
          <RotateCcwIcon />
          撤销
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 text-xs"
          onClick={function () {
            updateReviewOpen(function (open) {
              return !open
            })
          }}>
          <ScanSearchIcon />
          审阅
        </Button>
      </div>

      <Collapsible
        open={isReviewOpen}
        onOpenChange={updateReviewOpen}>
        <CollapsibleTrigger className="text-muted-foreground hover:bg-muted/40 flex w-full items-center gap-1 border-t px-3 py-1.5 text-xs">
          <ChevronDownIcon
            className={
              isReviewOpen ? 'size-3.5 rotate-180 transition-transform' : 'size-3.5 transition-transform'
            }
          />
          {isReviewOpen ? '收起文件列表' : `查看 ${entries.length} 个文件`}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="border-border/60 max-h-48 overflow-y-auto border-t">
            {entries.map(function (entry) {
              return (
                <li
                  key={entry.id}
                  className="hover:bg-muted/30 flex items-center gap-2 px-3 py-1.5 text-xs">
                  <span
                    className="min-w-0 flex-1 truncate font-mono"
                    title={entry.path}>
                    {entry.path}
                  </span>
                  <span className="text-emerald-600 dark:text-emerald-400">+{entry.added}</span>
                  <span className="text-rose-600 dark:text-rose-400">−{entry.removed}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`撤销 ${entry.path}`}
                    disabled={undo.isPending}
                    onClick={function () {
                      undo.mutate(entry.id)
                    }}>
                    <RotateCcwIcon />
                  </Button>
                </li>
              )
            })}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </div>
  )
}
