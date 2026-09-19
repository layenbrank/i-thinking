import { ThreadListPrimitive, useAui, useAuiState } from '@assistant-ui/react'
import { useAssistantLabels } from '@i-thinking/design/assistant/labels'
import { ThreadListItem, ThreadListSearch } from '@i-thinking/design/assistant/thread-list.aui'
import { Avatar, AvatarFallback } from '@i-thinking/design/components/avatar'
import { Button } from '@i-thinking/design/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'
import {
  ChevronRightIcon,
  FolderIcon,
  MoreHorizontalIcon,
  PinIcon,
  PlusIcon,
  UserIcon
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'

import {
  useActiveWorkspaceID,
  useWorkspaceActions,
  useWorkspaces,
  type Workspace
} from '@/features/agent/workspace/client.ts'
import { toIpcMessage } from '@/utils/ipc.errors.ts'
import { useWorkspaceThreadGroups } from '@/views/agent/chat/components/thread-groups.ts'
import { ProfileMenu } from '@/views/agent/chat/components/profile-menu.tsx'
import { ICON_MAP, WorkspaceForm } from '@/views/agent/chat/components/workspace-form.tsx'

interface SidebarProps {
  onOpenSettings: () => void
  /** 递增它把焦点送到搜索框（`⌘F`）；从 0 开始，所以 0 表示“还没按过” */
  searchFocusToken?: number
}

/**
 * 左栏（导航）：新任务 / 搜索 + 工作区 Collapse 树 → 会话 + 底栏头像/设置。
 *
 * 入口唯一性：设置页只从底部齿轮菜单的「设置」进去。
 */
export default function AgentSidebar(props: SidebarProps) {
  const labels = useAssistantLabels()
  const aui = useAui()
  const [search, updateSearch] = useState('')
  const [formOpen, updateFormOpen] = useState(false)
  const [editingID, updateEditingID] = useState<string | null>(null)
  const [expanded, updateExpanded] = useState<Record<string, boolean>>({})
  const isLoading = useAuiState(function (state) {
    return state.threads.isLoading
  })
  const { threadIds, groups } = useWorkspaceThreadGroups(search)
  const workspaces = useWorkspaces()
  const activeWorkspaceID = useActiveWorkspaceID()
  const { selectWorkspace } = useWorkspaceActions()
  const isSearching = search.trim().length > 0
  const searchRef = useRef<HTMLInputElement>(null)

  const indicesByWorkspace = useMemo(
    function () {
      const map = new Map<string, number[]>()
      for (const group of groups) map.set(group.id, group.indices)
      return map
    },
    [groups]
  )

  const rows = useMemo(
    function () {
      const list = [...(workspaces.data ?? [])]
      list.sort(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return a.sort - b.sort
      })
      return list
    },
    [workspaces.data]
  )

  useEffect(
    function () {
      if (!props.searchFocusToken) return
      searchRef.current?.focus()
      searchRef.current?.select()
    },
    [props.searchFocusToken]
  )

  useEffect(
    function () {
      if (!activeWorkspaceID) return
      updateExpanded(function (prev) {
        if (prev[activeWorkspaceID]) return prev
        return { ...prev, [activeWorkspaceID]: true }
      })
    },
    [activeWorkspaceID]
  )

  function openCreate() {
    updateEditingID(null)
    updateFormOpen(true)
  }

  function openEdit(id: string) {
    updateEditingID(id)
    updateFormOpen(true)
  }

  async function handlePin(item: Workspace) {
    try {
      await itc.workspace.toUpdate({ id: item.id, pinned: !item.pinned })
      await workspaces.refetch()
    } catch (error) {
      toast.error(toIpcMessage(error, '固定失败'))
    }
  }

  async function handleArchive(id: string) {
    try {
      await itc.workspace.toArchive({ id })
      await workspaces.refetch()
      toast.success('已归档工作区')
    } catch (error) {
      toast.error(toIpcMessage(error, '归档失败'))
    }
  }

  function handleNewThreadIn(workspaceID: string) {
    void selectWorkspace.mutateAsync(workspaceID).then(function () {
      void aui.threads.switchToNewThread()
    })
  }

  const unboundIndices = indicesByWorkspace.get('__unbound__') ?? []

  return (
    <aside
      data-slot="agent-sidebar"
      className="bg-sidebar text-sidebar-foreground flex h-full min-h-0 flex-col px-2.5 pt-2.5 pb-2">
      <div className="mb-2 flex flex-col gap-1">
        <ThreadListPrimitive.New asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="hover:bg-muted h-8 w-full justify-start gap-1.5 rounded-md px-2 text-[13px] font-medium">
            <PlusIcon className="size-4" />
            {labels.newThread}
          </Button>
        </ThreadListPrimitive.New>
        <ThreadListSearch
          ref={searchRef}
          value={search}
          onValueChange={updateSearch}
          className="bg-muted/50 border-transparent h-8 rounded-md text-xs shadow-none"
        />
      </div>

      <div className="border-border/70 mb-1 flex items-center justify-between border-t pt-2">
        <span className="text-muted-foreground px-1.5 text-xs font-medium">工作区</span>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className="hover:bg-muted size-7 rounded-md"
          aria-label="新建工作区"
          title="新建工作区"
          onClick={openCreate}>
          <PlusIcon className="size-3.5" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-1">
        {isLoading ? <p className="text-muted-foreground px-2 pt-3 text-xs">加载中…</p> : null}

        {rows.map(function (item) {
          const Icon = ICON_MAP[item.icon] ?? FolderIcon
          const isOpen = expanded[item.id] ?? item.id === activeWorkspaceID
          const indices = indicesByWorkspace.get(item.id) ?? []
          const isActive = item.id === activeWorkspaceID

          return (
            <Collapsible
              key={item.id}
              open={isOpen}
              onOpenChange={function (next) {
                updateExpanded(function (prev) {
                  return { ...prev, [item.id]: next }
                })
              }}>
              <div
                data-active={isActive ? 'true' : 'false'}
                className="hover:bg-muted/60 data-[active=true]:bg-muted/80 group flex min-h-[34px] items-center gap-0.5 rounded-lg px-0.5">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="text-muted-foreground size-[22px] shrink-0 rounded"
                    aria-label={isOpen ? '折叠' : '展开'}>
                    <ChevronRightIcon
                      className={
                        isOpen
                          ? 'size-3.5 rotate-90 transition-transform'
                          : 'size-3.5 transition-transform'
                      }
                    />
                  </Button>
                </CollapsibleTrigger>

                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pe-1 text-start text-xs"
                  title={item.primaryPath ?? item.title}
                  onClick={function () {
                    void selectWorkspace.mutateAsync(item.id)
                    updateExpanded(function (prev) {
                      return { ...prev, [item.id]: true }
                    })
                  }}>
                  <span
                    className="flex size-5 shrink-0 items-center justify-center rounded text-white"
                    style={{ backgroundColor: item.color }}>
                    <Icon className="size-3" />
                  </span>
                  <span
                    className={
                      isActive
                        ? 'min-w-0 flex-1 truncate text-[12px] font-semibold'
                        : 'min-w-0 flex-1 truncate text-[12px] font-medium'
                    }>
                    {item.title}
                  </span>
                  {item.pinned ? <PinIcon className="text-muted-foreground size-3 shrink-0" /> : null}
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="size-[22px] rounded opacity-0 group-hover:opacity-100"
                  aria-label="在此工作区新建任务"
                  title="新建任务"
                  onClick={function () {
                    handleNewThreadIn(item.id)
                  }}>
                  <PlusIcon className="size-3.5" />
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      className="size-[22px] rounded opacity-0 group-hover:opacity-100"
                      aria-label="工作区菜单">
                      <MoreHorizontalIcon className="size-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={function () {
                        openEdit(item.id)
                      }}>
                      编辑
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={function () {
                        void handlePin(item)
                      }}>
                      {item.pinned ? '取消固定' : '固定'}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={function () {
                        void handleArchive(item.id)
                      }}>
                      归档
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <CollapsibleContent className="flex flex-col gap-0.5 ps-[18px]">
                {indices.map(function (index) {
                  return (
                    <ThreadListPrimitive.ItemByIndex
                      key={threadIds[index]}
                      index={index}
                      components={{ ThreadListItem }}
                    />
                  )
                })}
                {!isLoading && indices.length === 0 && !isSearching ? (
                  <p className="text-muted-foreground px-2.5 py-1.5 text-xs italic">还没有任务</p>
                ) : null}
              </CollapsibleContent>
            </Collapsible>
          )
        })}

        {unboundIndices.length > 0 ? (
          <div className="mt-2">
            <p className="text-muted-foreground px-2 pb-1 text-xs font-medium">未关联工作区</p>
            {unboundIndices.map(function (index) {
              return (
                <ThreadListPrimitive.ItemByIndex
                  key={threadIds[index]}
                  index={index}
                  components={{ ThreadListItem }}
                />
              )
            })}
          </div>
        ) : null}

        {!isLoading && rows.length === 0 ? (
          <p className="text-muted-foreground px-2.5 pt-3 text-xs italic leading-relaxed">
            {isSearching ? '没有匹配的任务' : '还没有工作区，点上方 + 新建一个'}
          </p>
        ) : null}
      </div>

      <div className="border-border/70 mt-auto flex items-center gap-2 border-t pt-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
          <Avatar size="sm">
            <AvatarFallback>
              <UserIcon className="size-3.5" />
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-xs">本地</span>
        </div>
        <ProfileMenu onOpenSettings={props.onOpenSettings} />
      </div>

      <WorkspaceForm
        open={formOpen}
        workspaceID={editingID}
        onOpenChange={updateFormOpen}
      />
    </aside>
  )
}
