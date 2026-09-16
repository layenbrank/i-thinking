import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import { ScrollArea } from '@i-thinking/design/components/scroll-area'
import { cn } from 'cn'
import { ChevronLeftIcon, FileIcon, FolderIcon, Loader2Icon } from 'lucide-react'
import { useState } from 'react'

import {
  useActiveWorkspaceID,
  useDirEntries,
  useWorkspaceSearch
} from '@/features/agent/workspace/client.ts'

/**
 * 工作区文件选择器：`+` 双栏「工作区」面板复用。
 *
 * 选中的路径怎么落成附件由 `features/agent/attachment.ts` 统一负责。
 */

interface WorkspaceFilePickerProps {
  /** 选完后的动作；由调用方决定（加附件等） */
  onPick: (relative: string) => void
  /** 弹出层内不需要外边框与圆角 */
  className?: string
  /** 列表区域额外 class（双栏里用 flex-1 替代固定 max-height） */
  listClassName?: string
  /** 打开时才拉数据，避免菜单一渲染就发 IPC */
  active: boolean
  /**
   * 在根目录时是否给出「返回」。
   * 双栏 `+` 一般不需要；单页入口可用来回上层。
   */
  onBack?: () => void
}

function WorkspaceFilePicker(props: WorkspaceFilePickerProps) {
  const workspaceID = useActiveWorkspaceID()
  const [relative, updateRelative] = useState('')
  const [query, updateQuery] = useState('')

  const dir = useDirEntries(props.active ? workspaceID : null, relative)
  const search = useWorkspaceSearch(props.active ? workspaceID : null, query)
  const isSearching = query.trim().length > 0
  const isPending = dir.isFetching || search.isFetching

  const entries = isSearching
    ? (search.data ?? []).map(function (hit) {
        return { name: hit.name, kind: 'file' as const, relative: hit.relative }
      })
    : (dir.data ?? [])

  const parentRelative = relative.includes('/') ? relative.slice(0, relative.lastIndexOf('/')) : ''
  const canGoUp = !isSearching && relative.length > 0
  const canReturn = !isSearching && !relative && Boolean(props.onBack)

  return (
    <div className={props.className}>
      <div className="flex items-center gap-1 border-b p-2">
        {canGoUp ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="返回上级目录"
            onClick={function () {
              updateRelative(parentRelative)
            }}>
            <ChevronLeftIcon />
          </Button>
        ) : null}
        <Input
          autoFocus
          value={query}
          placeholder="搜索当前项目文件"
          aria-label="搜索当前项目文件"
          className="h-7 text-xs"
          onChange={function (event) {
            updateQuery(event.target.value)
          }}
        />
      </div>

      {canReturn ? (
        <button
          type="button"
          className="text-muted-foreground hover:bg-muted hover:text-foreground flex w-full items-center gap-1.5 border-b px-2.5 py-1.5 text-start text-xs"
          onClick={props.onBack}>
          <ChevronLeftIcon className="size-3.5 shrink-0" />
          返回工作区列表
        </button>
      ) : null}

      {!isSearching && relative ? (
        <p className="text-muted-foreground truncate px-2.5 pt-1.5 text-[11px]">{relative}</p>
      ) : null}

      <ScrollArea className={cn('max-h-70 p-1.5', props.listClassName)}>
        {isPending ? (
          <p className="text-muted-foreground flex items-center gap-1.5 p-2.5 text-xs">
            <Loader2Icon className="size-3.5 animate-spin" />
            读取中…
          </p>
        ) : null}

        {!isPending
          ? entries.map(function (entry) {
              const isDir = entry.kind === 'dir'

              return (
                <Button
                  key={entry.relative}
                  type="button"
                  variant="ghost"
                  className="h-auto w-full justify-start gap-2 px-2 py-1.5 text-xs font-normal"
                  onClick={function () {
                    if (isDir) {
                      updateRelative(entry.relative)
                      return
                    }
                    props.onPick(entry.relative)
                  }}>
                  {isDir ? (
                    <FolderIcon className="text-muted-foreground size-3.5 shrink-0" />
                  ) : (
                    <FileIcon className="text-muted-foreground size-3.5 shrink-0" />
                  )}
                  <span className="max-w-[45%] shrink-0 truncate">{entry.name}</span>
                  <span className="text-muted-foreground min-w-0 flex-1 truncate text-end text-[11px]">
                    {entry.relative}
                  </span>
                </Button>
              )
            })
          : null}

        {!isPending && entries.length === 0 ? (
          <p className="text-muted-foreground p-2.5 text-xs">
            {isSearching ? '没有匹配的文件' : workspaceID ? '这个目录是空的' : '先在左栏添加工作区'}
          </p>
        ) : null}
      </ScrollArea>
    </div>
  )
}

export { WorkspaceFilePicker }
export type { WorkspaceFilePickerProps }
