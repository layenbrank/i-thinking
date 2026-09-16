import { useThreadTokenUsage } from '@assistant-ui/ai-sdk'
import { Button } from '@i-thinking/design/components/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'
import { useQuery } from '@tanstack/react-query'
import { CheckIcon, FolderIcon, GitBranchIcon, HardDriveIcon } from 'lucide-react'
import { toast } from 'sonner'

import {
  useActiveWorkspace,
  useActiveWorkspaceID
} from '@/features/agent/workspace/client.ts'
import { formatUsageCompact } from '@/features/chat/usage.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'
import { ChangeSummary } from '@/views/agent/chat/components/change-summary.tsx'

/**
 * 输入框下方：变更汇总（若有）+ 工作区 · 本地 · 分支 + 上下文用量。
 * 用量放右端，对齐 client composer footer。
 */
export function ComposerFooter() {
  const activeWorkspace = useActiveWorkspace()
  const workspaceID = useActiveWorkspaceID()
  const usage = useThreadTokenUsage()
  const usageLabel = formatUsageCompact(usage)

  const git = useQuery({
    queryKey: ['workspace', 'git', 'probe', workspaceID],
    queryFn: function () {
      return itc.workspace.git.probe({ workspaceID: workspaceID as string })
    },
    enabled: Boolean(workspaceID),
    staleTime: 15_000
  })

  const branches = useQuery({
    queryKey: ['workspace', 'git', 'branches', workspaceID],
    queryFn: function () {
      return itc.workspace.git.branches({ workspaceID: workspaceID as string })
    },
    enabled: Boolean(workspaceID && git.data?.isRepo),
    staleTime: 30_000
  })

  async function handleCheckout(branch: string) {
    if (!workspaceID || branch === git.data?.branch) return
    try {
      const result = await itc.workspace.git.checkout({ workspaceID, branch })
      await git.refetch()
      await branches.refetch()
      toast.success(`已切换到 ${result.branch}`)
    } catch (error) {
      toast.error(toIpcMessage(error, '切换分支失败'))
    }
  }

  const showGit = Boolean(git.data?.isRepo && git.data.branch)

  return (
    <div className="flex w-full flex-col gap-1">
      <ChangeSummary />

      <div className="text-muted-foreground flex min-h-7 items-center gap-0 px-1 text-xs">
        <div className="flex min-w-0 flex-1 items-center justify-start gap-0">
          <span className="flex max-w-[200px] min-w-0 items-center gap-1.5 px-2.5 opacity-90">
            <FolderIcon className="size-3 shrink-0" />
            <span
              className="truncate"
              title={activeWorkspace?.primaryPath ?? undefined}>
              {activeWorkspace?.title ?? '未选择工作区'}
            </span>
          </span>

          <span
            aria-hidden
            className="bg-border mx-0.5 h-3.5 w-px shrink-0"
          />

          <span className="flex shrink-0 items-center gap-1.5 px-2.5 opacity-90">
            <HardDriveIcon className="size-3 shrink-0" />
            本地
          </span>

          {showGit ? (
            <>
              <span
                aria-hidden
                className="bg-border mx-0.5 h-3.5 w-px shrink-0"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground h-7 gap-1 rounded-md px-2.5 text-xs">
                    <GitBranchIcon className="size-3" />
                    <span className="max-w-28 truncate">{git.data?.branch}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-h-64 overflow-y-auto">
                  {(branches.data?.branches ?? [git.data?.branch].filter(Boolean)).map(
                    function (branch) {
                      if (!branch) return null
                      const isActive = branch === git.data?.branch
                      return (
                        <DropdownMenuItem
                          key={branch}
                          onSelect={function () {
                            void handleCheckout(branch)
                          }}>
                          <CheckIcon className={isActive ? 'opacity-100' : 'opacity-0'} />
                          <span className="truncate">{branch}</span>
                        </DropdownMenuItem>
                      )
                    }
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : null}
        </div>

        {usageLabel ? (
          <span
            className="text-muted-foreground ms-auto shrink-0 px-1 font-mono text-[12px] tabular-nums opacity-90"
            title="当前会话用量">
            {usageLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
}
