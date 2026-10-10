/**
 * Qoder 式左侧栏：工作模式 + 新任务/搜索 + 工作区会话树 + 底栏头像/设置
 */
import { Icon } from '@iconify/react/offline'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@i-thinking/design/components/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@i-thinking/design/components/avatar'
import { Button } from '@i-thinking/design/components/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@i-thinking/design/components/collapsible'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@i-thinking/design/components/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger
} from '@i-thinking/design/components/dropdown-menu'
import { Input } from '@i-thinking/design/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@i-thinking/design/components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { v4 as UUIDV4 } from 'uuid'

import { Glide } from '@/components/glide/glide'
import { SessionSearch } from './session-search'
import styles from './sidebar.module.scss'
import { WorkspaceForm } from './workspace-form'
import { SCENARIOS, type ScenarioKey } from '@/features/agent/model/scenarios'
import { UNGROUPED_WORKSPACE, findWorkspaceIcon } from '@/features/agent/model/workspace'
import { useAgentStore, type AiSession } from '@/stores/agent.ts'
import { useSessionStore } from '@/stores/session'

interface SidebarProps {
  className?: string
  scenario: ScenarioKey
  isSearchOpen?: boolean
  searchFocusToken?: number
  onScenarioChange: (scenario: ScenarioKey) => void
  onSearchOpenChange?: (open: boolean) => void
  onOpenSettings: () => void
}

interface WorkspaceBranch {
  id: string
  title: string
  icon: string
  color: string
  pinned: boolean
  paths: string[]
  sessions: AiSession[]
}

interface RenameTarget {
  id: string
  title: string
}

function sortSessions(a: AiSession, b: AiSession) {
  if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
  return b.updatedAt - a.updatedAt
}

function AgentSidebar(props: SidebarProps) {
  const sessions = useAgentStore(function (state) {
    return state.sessions
  })
  const workspaces = useAgentStore(function (state) {
    return state.workspaces
  })
  const workspaceFolders = useAgentStore(function (state) {
    return state.workspaceFolders
  })
  const activeSessionID = useAgentStore(function (state) {
    return state.activeSessionID
  })
  const activeWorkspaceID = useAgentStore(function (state) {
    return state.activeWorkspaceID
  })
  const user = useSessionStore(function (state) {
    return state.user
  })

  const [sectionOpen, updateSectionOpen] = useState(true)
  const [expandedKeys, updateExpandedKeys] = useState<string[]>([])
  const [renaming, updateRenaming] = useState<RenameTarget | null>(null)
  const [renameValue, updateRenameValue] = useState('')
  const [formOpen, updateFormOpen] = useState(false)
  const [editingWorkspaceID, updateEditingWorkspaceID] = useState<string | null>(null)
  const [pendingRemove, updatePendingRemove] = useState<AiSession | null>(null)
  const [hoverSessionID, updateHoverSessionID] = useState<string | null>(null)

  const isSearchOpen = Boolean(props.isSearchOpen)
  const displayName = user?.username || '未登录'

  useEffect(
    function () {
      if (!props.searchFocusToken) return
      props.onSearchOpenChange?.(true)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [props.searchFocusToken]
  )

  const branches: WorkspaceBranch[] = useMemo(
    function () {
      const sortedWorkspaces = workspaces.toSorted(function (a, b) {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
        return b.updatedAt - a.updatedAt
      })

      const result: WorkspaceBranch[] = []

      for (const workspace of sortedWorkspaces) {
        const matched = sessions.filter(function (session) {
          return session.workspaceID === workspace.id
        })

        const paths = workspaceFolders
          .filter(function (folder) {
            return folder.workspaceID === workspace.id
          })
          .toSorted(function (a, b) {
            if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
            return a.sort - b.sort
          })
          .map(function (folder) {
            return folder.path
          })

        result.push({
          id: workspace.id,
          title: workspace.title,
          icon: workspace.icon,
          color: workspace.color,
          pinned: workspace.pinned,
          paths,
          sessions: matched.toSorted(sortSessions)
        })
      }

      const ungrouped = sessions.filter(function (session) {
        return !session.workspaceID
      })
      if (ungrouped.length > 0) {
        result.push({
          id: UNGROUPED_WORKSPACE,
          title: '未分组',
          icon: 'folder',
          color: '',
          pinned: false,
          paths: [],
          sessions: ungrouped.toSorted(sortSessions)
        })
      }

      return result
    },
    [workspaces, sessions, workspaceFolders]
  )

  useEffect(
    function () {
      updateExpandedKeys(function (prev) {
        const next = new Set(prev)
        let changed = false
        for (const branch of branches) {
          if (!next.has(branch.id)) {
            next.add(branch.id)
            changed = true
          }
        }
        return changed ? Array.from(next) : prev
      })
    },
    [branches]
  )

  function handleActivateSession(session: AiSession) {
    if (session.workspaceID) {
      useAgentStore.getState().toActivateWorkspace(session.workspaceID)
    }
    useAgentStore.getState().toReadSession(session.id)
    void useAgentStore.getState().toReadMessages(session.id)
  }

  async function handleInsertSession(workspaceID?: string | null) {
    let targetID = workspaceID ?? activeWorkspaceID
    if (!targetID) {
      targetID = workspaces[0]?.id ?? null
    }
    if (!targetID) {
      toast.info('请先新建工作区')
      updateEditingWorkspaceID(null)
      updateFormOpen(true)
      return
    }
    const sessionID = UUIDV4()
    const now = Date.now()
    await useAgentStore.getState().toWriteSession([
      {
        id: sessionID,
        title: '新对话',
        pinned: false,
        workspaceID: targetID,
        createdAt: now,
        updatedAt: now
      }
    ])
    handleActivateSession({
      id: sessionID,
      title: '新对话',
      pinned: false,
      workspaceID: targetID,
      createdAt: now,
      updatedAt: now
    })
    if (!sectionOpen) updateSectionOpen(true)
    if (!expandedKeys.includes(targetID)) {
      updateExpandedKeys(function (keys) {
        return [...keys, targetID]
      })
    }
  }

  function findWorkspaceLabel(branch: WorkspaceBranch) {
    const isUngrouped = branch.id === UNGROUPED_WORKSPACE
    return (
      <span className={styles.workspaceTitleInner}>
        {!isUngrouped && branch.color ? (
          <span
            className={styles.workspaceDot}
            style={{ background: branch.color }}
          />
        ) : null}
        <Icon
          icon={findWorkspaceIcon(branch.icon)}
          width={14}
          height={14}
        />
        <span className={styles.workspaceTitle}>{branch.title}</span>
      </span>
    )
  }

  function findWorkspaceExtra(branch: WorkspaceBranch) {
    if (branch.id === UNGROUPED_WORKSPACE) return null
    return (
      <span className={styles.workspaceActions}>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className={styles.workspaceAction}
                aria-label="工作区菜单"
              />
            }>
            <Icon
              icon="mdi:dots-horizontal"
              width={16}
              height={16}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40">
            <DropdownMenuItem
              onClick={function () {
                void useAgentStore
                  .getState()
                  .toUpdateWorkspace([{ id: branch.id, pinned: !branch.pinned }])
              }}>
              {branch.pinned ? '取消固定' : '固定'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={function () {
                updateEditingWorkspaceID(branch.id)
                updateFormOpen(true)
              }}>
              编辑
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={function () {
                void useAgentStore
                  .getState()
                  .toUpdateWorkspace([{ id: branch.id, archivedAt: Date.now() }])
              }}>
              归档工作区
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="ghost"
          size="icon-xs"
          className={styles.workspaceAction}
          aria-label="新建会话"
          onClick={function () {
            void handleInsertSession(branch.id)
          }}>
          <Icon
            icon="mdi:plus"
            width={16}
            height={16}
          />
        </Button>
      </span>
    )
  }

  function findSessionHover(branch: WorkspaceBranch, session: AiSession) {
    return (
      <>
        <p className={clsx(styles.hoverTitle, 'line-clamp-2')}>{session.title}</p>
        <span className="text-muted-foreground text-xs">
          {dayjs(session.updatedAt).format('M月D日')}
        </span>
        <span className="text-muted-foreground text-xs">{branch.title}</span>
        {branch.paths.map(function (path) {
          return (
            <span
              key={path}
              className="text-muted-foreground truncate text-xs">
              {path}
            </span>
          )
        })}
      </>
    )
  }

  function findSessionChildren(branch: WorkspaceBranch) {
    if (branch.sessions.length === 0) {
      return <span className={styles.emptySession}>暂无会话</span>
    }
    return (
      <div className="flex flex-col gap-0.5">
        {branch.sessions.map(function (session) {
          const active = activeSessionID === session.id
          return (
            <span
              key={session.id}
              className={clsx(styles.sessionRow, active && styles.sessionActive)}>
              <Popover
                open={hoverSessionID === session.id}
                onOpenChange={function (open, details) {
                  // 悬停卡只认悬停：点击交给行内按钮，不要顶出卡片
                  if (open && details.reason === 'trigger-press') return
                  updateHoverSessionID(open ? session.id : null)
                }}>
                <PopoverTrigger
                  openOnHover
                  delay={350}
                  render={
                    <button
                      type="button"
                      className={styles.sessionMain}
                      onClick={function () {
                        handleActivateSession(session)
                      }}
                    />
                  }>
                  <Icon
                    icon="lucide:file-text"
                    className="size-3.5 shrink-0"
                  />
                  <span className={styles.sessionTitle}>{session.title}</span>
                </PopoverTrigger>
                <PopoverContent
                  side="right"
                  align="start"
                  className={styles.hoverCard}>
                  {findSessionHover(branch, session)}
                </PopoverContent>
              </Popover>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className={styles.sessionMore}
                      aria-label="会话菜单"
                    />
                  }>
                  <Icon
                    icon="mdi:dots-horizontal"
                    width={16}
                    height={16}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-40">
                  <DropdownMenuItem
                    onClick={function () {
                      updateRenameValue(session.title)
                      updateRenaming({ id: session.id, title: session.title })
                    }}>
                    <Icon
                      icon="mdi:pencil-outline"
                      width={14}
                      height={14}
                    />
                    重命名
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={function () {
                      void useAgentStore
                        .getState()
                        .toUpdateSession([{ id: session.id, pinned: !session.pinned }])
                    }}>
                    <Icon
                      icon={session.pinned ? 'mdi:pin-off-outline' : 'mdi:pin-outline'}
                      width={14}
                      height={14}
                    />
                    {session.pinned ? '取消置顶' : '置顶'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={function () {
                      updatePendingRemove(session)
                    }}>
                    <Icon
                      icon="mdi:delete-outline"
                      width={14}
                      height={14}
                    />
                    移除会话
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </span>
          )
        })}
      </div>
    )
  }

  function handleToggleSearch() {
    props.onSearchOpenChange?.(!isSearchOpen)
  }

  function handleCloseSearch() {
    props.onSearchOpenChange?.(false)
  }

  async function handleRename() {
    if (!renaming) return
    const title = renameValue.trim()
    if (title) {
      await useAgentStore.getState().toUpdateSession([{ id: renaming.id, title }])
    }
    updateRenaming(null)
  }

  async function handleRemoveSession() {
    const target = pendingRemove
    updatePendingRemove(null)
    if (!target) return
    await useAgentStore.getState().toRemoveSession([target.id])
  }

  return (
    <div className={clsx(styles.root, props.className)}>
      <div className={`${styles.topNav} flex items-center gap-1`}>
        <Glide.X
          classNames={{
            root: styles.scenarioGlide,
            inner: styles.scenarioRow
          }}>
          {SCENARIOS.map(function (item) {
            const active = item.key === props.scenario
            return (
              <Tooltip key={item.key}>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className={clsx(styles.scenarioBtn, active && styles.scenarioBtnActive)}
                      aria-label={item.label}
                      aria-pressed={active}
                      onClick={function () {
                        props.onScenarioChange(item.key)
                      }}
                    />
                  }>
                  <Icon
                    icon={item.icon}
                    width={16}
                    height={16}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </Glide.X>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className={clsx(styles.scenarioBtn, isSearchOpen && styles.scenarioBtnActive)}
                aria-label="搜索"
                aria-pressed={isSearchOpen}
                onClick={handleToggleSearch}
              />
            }>
            <Icon
              icon="lucide:search"
              width={16}
              height={16}
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">搜索</TooltipContent>
        </Tooltip>
      </div>

      <div className={`${styles.section} flex min-h-0 flex-1 flex-col`}>
        <div className={`${styles.sectionHeader} flex items-center justify-between gap-1`}>
          <Button
            variant="ghost"
            className={styles.sectionTitle}
            onClick={function () {
              updateSectionOpen(function (open) {
                return !open
              })
            }}>
            工作区
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={styles.sectionAdd}
            aria-label="新建工作区"
            onClick={function () {
              updateEditingWorkspaceID(null)
              updateFormOpen(true)
            }}>
            <Icon
              icon="mdi:plus"
              width={16}
              height={16}
            />
          </Button>
        </div>

        {sectionOpen ? (
          branches.length === 0 ? (
            <p className={styles.empty}>暂无工作区，点击 + 新建</p>
          ) : (
            <div className={styles.tree}>
              {branches.map(function (branch) {
                const isOpen = expandedKeys.includes(branch.id)
                return (
                  <Collapsible
                    key={branch.id}
                    open={isOpen}
                    onOpenChange={function (open) {
                      updateExpandedKeys(function (keys) {
                        if (open) {
                          return keys.includes(branch.id) ? keys : [...keys, branch.id]
                        }
                        return keys.filter(function (key) {
                          return key !== branch.id
                        })
                      })
                    }}
                    className={clsx(
                      styles.branch,
                      activeWorkspaceID === branch.id && styles.workspaceActive
                    )}>
                    <div className={styles.workspaceHeader}>
                      <CollapsibleTrigger
                        render={
                          <button
                            type="button"
                            className={styles.workspaceTitleSlot}
                            aria-label={branch.title}
                          />
                        }>
                        <span className={styles.expandIcon}>
                          <Icon
                            icon={isOpen ? 'mdi:chevron-down' : 'mdi:chevron-right'}
                            width={16}
                            height={16}
                          />
                        </span>
                        {findWorkspaceLabel(branch)}
                      </CollapsibleTrigger>
                      {findWorkspaceExtra(branch)}
                    </div>
                    <CollapsibleContent className={styles.sessionBody}>
                      {findSessionChildren(branch)}
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          )
        ) : null}
      </div>

      <div className={`${styles.profile} flex items-center justify-between gap-2`}>
        <div className={`${styles.profileUser} flex items-center gap-2`}>
          <Avatar size="sm">
            {user?.avatarUrl ? (
              <AvatarImage
                src={user.avatarUrl}
                alt={displayName}
              />
            ) : null}
            <AvatarFallback>
              <Icon
                icon="lucide:user"
                className="size-3.5"
              />
            </AvatarFallback>
          </Avatar>
          <span className={styles.profileName}>{displayName}</span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="设置"
                className={styles.profileSettings}
              />
            }>
            <Icon
              icon="lucide:settings"
              width={16}
              height={16}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side="top"
            align="end"
            className="w-40">
            <DropdownMenuItem onClick={props.onOpenSettings}>
              <Icon
                icon="lucide:settings"
                width={14}
                height={14}
              />
              设置
            </DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icon
                  icon="lucide:palette"
                  width={14}
                  height={14}
                />
                外观
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem disabled>主题</DropdownMenuItem>
                <DropdownMenuItem disabled>明暗模式</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={function () {
                toast.info('i-thinking Agent')
              }}>
              <Icon
                icon="lucide:info"
                width={14}
                height={14}
              />
              关于
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog
        open={Boolean(renaming)}
        onOpenChange={function (open) {
          if (!open) updateRenaming(null)
        }}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
            <DialogDescription className="sr-only">修改会话标题</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={function (event) {
              updateRenameValue(event.target.value)
            }}
            onKeyDown={function (event) {
              if (event.key === 'Enter') void handleRename()
            }}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={function () {
                updateRenaming(null)
              }}>
              取消
            </Button>
            <Button
              onClick={function () {
                void handleRename()
              }}>
              确定
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={function (open) {
          if (!open) updatePendingRemove(null)
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>移除会话</AlertDialogTitle>
            <AlertDialogDescription>
              {`确定移除「${pendingRemove?.title ?? ''}」？此操作不可恢复。`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={function () {
                void handleRemoveSession()
              }}>
              移除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SessionSearch
        open={isSearchOpen}
        onClose={handleCloseSearch}
        onSelect={handleActivateSession}
      />

      <WorkspaceForm
        open={formOpen}
        workspaceID={editingWorkspaceID}
        onClose={function () {
          updateFormOpen(false)
          updateEditingWorkspaceID(null)
        }}
      />
    </div>
  )
}

export { AgentSidebar }
export type { SidebarProps }
