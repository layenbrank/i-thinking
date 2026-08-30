/**
 * Qoder 式左侧栏：工作模式 + 新任务/搜索 + 工作区会话树 + 底栏头像/设置
 */
import { Icon } from '@iconify/react/offline'
import {
  App,
  Avatar,
  Button,
  Collapse,
  Dropdown,
  Empty,
  Flex,
  Input,
  Modal,
  Popover,
  Tooltip,
  Typography,
  type MenuProps
} from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { v4 as UUIDV4 } from 'uuid'

import { Glide } from '@/components/glide/glide'
import { SessionSearch } from '@/features/agent/layout/session-search'
import styles from '@/features/agent/layout/sidebar.module.scss'
import { WorkspaceForm } from '@/features/agent/layout/workspace-form'
import { SCENARIOS, type ScenarioKey } from '@/features/agent/model/scenarios'
import { UNGROUPED_WORKSPACE, findWorkspaceIcon } from '@/features/agent/model/workspace'
import { useIntelligenceStore, type AiSession } from '@/stores/intelligence.ts'
import { useSessionStore } from '@/stores/session'

interface SidebarProps {
  className?: string
  scenario: ScenarioKey
  isSearchOpen?: boolean
  searchFocusToken?: number
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement
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
  const { message, modal } = App.useApp()
  const sessions = useIntelligenceStore(function (state) {
    return state.sessions
  })
  const workspaces = useIntelligenceStore(function (state) {
    return state.workspaces
  })
  const workspaceFolders = useIntelligenceStore(function (state) {
    return state.workspaceFolders
  })
  const activeSessionID = useIntelligenceStore(function (state) {
    return state.activeSessionID
  })
  const activeWorkspaceID = useIntelligenceStore(function (state) {
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

  function findPopupContainer(trigger?: HTMLElement) {
    if (props.getPopupContainer && trigger) return props.getPopupContainer(trigger)
    return document.body
  }

  function handleActivateWorkspace(workspaceID: string) {
    if (workspaceID === UNGROUPED_WORKSPACE) return
    useIntelligenceStore.getState().toActivateWorkspace(workspaceID)
  }

  function handleActivateSession(session: AiSession) {
    if (session.workspaceID) {
      useIntelligenceStore.getState().toActivateWorkspace(session.workspaceID)
    }
    useIntelligenceStore.getState().toReadSession(session.id)
    void useIntelligenceStore.getState().toReadMessages(session.id)
  }

  async function handleInsertSession(workspaceID?: string | null) {
    let targetID = workspaceID ?? activeWorkspaceID
    if (!targetID) {
      targetID = workspaces[0]?.id ?? null
    }
    if (!targetID) {
      message.info('请先新建工作区')
      updateEditingWorkspaceID(null)
      updateFormOpen(true)
      return
    }
    const sessionID = UUIDV4()
    const now = Date.now()
    await useIntelligenceStore.getState().toWriteSession([
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

  function handleCollapseChange(keys: string | string[]) {
    const next = Array.isArray(keys) ? keys.map(String) : [String(keys)]
    updateExpandedKeys(next)
  }

  function findWorkspaceLabel(branch: WorkspaceBranch) {
    const isUngrouped = branch.id === UNGROUPED_WORKSPACE
    return (
      <Flex
        align="center"
        gap={6}
        className={styles.workspaceTitleInner}>
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
        <Typography.Text
          ellipsis
          className={styles.workspaceTitle}>
          {branch.title}
        </Typography.Text>
      </Flex>
    )
  }

  function findWorkspaceExtra(branch: WorkspaceBranch) {
    if (branch.id === UNGROUPED_WORKSPACE) return null
    return (
      <Flex
        align="center"
        gap={0}
        className={styles.workspaceActions}>
        <Dropdown
          trigger={['click']}
          placement="bottomRight"
          getPopupContainer={findPopupContainer}
          menu={findWorkspaceMenu(branch)}>
          <Button
            type="text"
            className={styles.workspaceAction}
            aria-label="工作区菜单"
            icon={<Icon icon="mdi:dots-horizontal" width={16} height={16} />}
            onClick={function (event) {
              event.stopPropagation()
            }}
          />
        </Dropdown>
        <Button
          type="text"
          className={styles.workspaceAction}
          aria-label="新建会话"
          icon={<Icon icon="mdi:plus" width={16} height={16} />}
          onClick={function (event) {
            event.stopPropagation()
            void handleInsertSession(branch.id)
          }}
        />
      </Flex>
    )
  }

  function findSessionChildren(branch: WorkspaceBranch) {
    if (branch.sessions.length === 0) {
      return (
        <Typography.Text
          type="secondary"
          className={styles.emptySession}>
          暂无会话
        </Typography.Text>
      )
    }
    return (
      <Flex
        vertical
        gap={2}>
        {branch.sessions.map(function (session) {
          const active = activeSessionID === session.id
          return (
            <Popover
              key={session.id}
              placement="rightTop"
              mouseEnterDelay={0.35}
              destroyOnHidden
              getPopupContainer={function () {
                return document.body
              }}
              content={findSessionHover(branch, session)}>
              <Flex
                align="center"
                className={clsx(styles.sessionRow, active && styles.sessionActive)}>
                <Button
                  type="text"
                  block
                  className={styles.sessionMain}
                  icon={
                    <Icon
                      icon="ant-design:file-text-outlined"
                      width={14}
                      height={14}
                    />
                  }
                  onClick={function () {
                    handleActivateSession(session)
                  }}>
                  <Typography.Text
                    ellipsis
                    className={styles.sessionTitle}>
                    {session.title}
                  </Typography.Text>
                </Button>
                <Dropdown
                  trigger={['click']}
                  placement="bottomRight"
                  getPopupContainer={findPopupContainer}
                  menu={findSessionMenu(session)}>
                  <Button
                    type="text"
                    className={styles.sessionMore}
                    aria-label="会话菜单"
                    icon={
                      <Icon
                        icon="mdi:dots-horizontal"
                        width={16}
                        height={16}
                      />
                    }
                    onClick={function (event) {
                      event.stopPropagation()
                    }}
                  />
                </Dropdown>
              </Flex>
            </Popover>
          )
        })}
      </Flex>
    )
  }

  function handleToggleSearch() {
    props.onSearchOpenChange?.(!isSearchOpen)
  }

  function handleCloseSearch() {
    props.onSearchOpenChange?.(false)
  }

  function findWorkspaceMenu(branch: WorkspaceBranch): MenuProps {
    return {
      items: [
        { key: 'pin', label: branch.pinned ? '取消固定' : '固定' },
        { key: 'edit', label: '编辑' },
        { key: 'archive', label: '归档工作区', danger: true }
      ],
      onClick: function ({ key, domEvent }) {
        domEvent.stopPropagation()
        if (key === 'pin') {
          void useIntelligenceStore
            .getState()
            .toUpdateWorkspace([{ id: branch.id, pinned: !branch.pinned }])
        } else if (key === 'edit') {
          updateEditingWorkspaceID(branch.id)
          updateFormOpen(true)
        } else if (key === 'archive') {
          void useIntelligenceStore
            .getState()
            .toUpdateWorkspace([{ id: branch.id, archivedAt: Date.now() }])
        }
      }
    }
  }

  function findSessionMenu(session: AiSession): MenuProps {
    return {
      items: [
        {
          key: 'rename',
          label: '重命名',
          icon: (
            <Icon
              icon="mdi:pencil-outline"
              width={14}
              height={14}
            />
          )
        },
        {
          key: 'pin',
          label: session.pinned ? '取消置顶' : '置顶',
          icon: (
            <Icon
              icon={session.pinned ? 'mdi:pin-off-outline' : 'mdi:pin-outline'}
              width={14}
              height={14}
            />
          )
        },
        { type: 'divider' },
        {
          key: 'remove',
          label: '移除会话',
          danger: true,
          icon: (
            <Icon
              icon="mdi:delete-outline"
              width={14}
              height={14}
            />
          )
        }
      ],
      onClick: function ({ key, domEvent }) {
        domEvent.stopPropagation()
        if (key === 'rename') {
          updateRenameValue(session.title)
          updateRenaming({ id: session.id, title: session.title })
          return
        }
        if (key === 'pin') {
          void useIntelligenceStore
            .getState()
            .toUpdateSession([{ id: session.id, pinned: !session.pinned }])
          return
        }
        if (key === 'remove') {
          modal.confirm({
            title: '移除会话',
            content: `确定移除「${session.title}」？此操作不可恢复。`,
            okText: '移除',
            okType: 'danger',
            cancelText: '取消',
            centered: true,
            onOk: function () {
              return useIntelligenceStore.getState().toRemoveSession([session.id])
            }
          })
        }
      }
    }
  }

  async function handleRename() {
    if (!renaming) return
    const title = renameValue.trim()
    if (title) {
      await useIntelligenceStore.getState().toUpdateSession([{ id: renaming.id, title }])
    }
    updateRenaming(null)
  }

  function findSessionHover(branch: WorkspaceBranch, session: AiSession) {
    return (
      <Flex
        vertical
        gap={4}
        className={styles.hoverCard}>
        <Typography.Paragraph
          ellipsis={{ rows: 2 }}
          className={styles.hoverTitle}>
          {session.title}
        </Typography.Paragraph>
        <Typography.Text type="secondary">
          {dayjs(session.updatedAt).format('M月D日')}
        </Typography.Text>
        <Typography.Text type="secondary">{branch.title}</Typography.Text>
        {branch.paths.map(function (path) {
          return (
            <Typography.Text
              key={path}
              type="secondary"
              ellipsis>
              {path}
            </Typography.Text>
          )
        })}
      </Flex>
    )
  }

  const settingsMenu: MenuProps = {
    items: [
      {
        key: 'settings',
        label: '设置',
        icon: <Icon icon="ant-design:setting-outlined" />
      },
      {
        key: 'appearance',
        label: '外观',
        icon: <Icon icon="ant-design:skin-outlined" />,
        children: [
          { key: 'appearance-theme', label: '主题', disabled: true },
          { key: 'appearance-mode', label: '明暗模式', disabled: true }
        ]
      },
      { type: 'divider' },
      {
        key: 'about',
        label: '关于',
        icon: <Icon icon="ant-design:info-circle-outlined" />
      }
    ],
    onClick: function ({ key }) {
      if (key === 'settings') {
        props.onOpenSettings()
        return
      }
      if (key === 'about') {
        message.info('i-thinking Agent')
      }
    }
  }

  return (
    <div className={clsx(styles.root, props.className)}>
      <Flex
        align="center"
        gap={4}
        className={styles.topNav}>
        <Glide.X
          classNames={{
            root: styles.scenarioGlide,
            inner: styles.scenarioRow
          }}>
          {SCENARIOS.map(function (item) {
            const active = item.key === props.scenario
            return (
              <Tooltip
                key={item.key}
                title={item.label}
                placement="bottom"
                mouseEnterDelay={0.45}
                mouseLeaveDelay={0.05}
                getPopupContainer={props.getPopupContainer}>
                <Button
                  type="text"
                  className={clsx(styles.scenarioBtn, active && styles.scenarioBtnActive)}
                  aria-label={item.label}
                  aria-pressed={active}
                  icon={
                    <Icon
                      icon={item.icon}
                      width={16}
                      height={16}
                    />
                  }
                  onClick={function () {
                    props.onScenarioChange(item.key)
                  }}
                />
              </Tooltip>
            )
          })}
        </Glide.X>

        <Tooltip
          title="搜索"
          placement="bottom"
          mouseEnterDelay={0.45}
          mouseLeaveDelay={0.05}
          getPopupContainer={props.getPopupContainer}>
          <Button
            type="text"
            className={clsx(styles.scenarioBtn, isSearchOpen && styles.scenarioBtnActive)}
            aria-label="搜索"
            aria-pressed={isSearchOpen}
            icon={
              <Icon
                icon="ant-design:search-outlined"
                width={16}
                height={16}
              />
            }
            onClick={handleToggleSearch}
          />
        </Tooltip>
      </Flex>

      <Flex
        vertical
        className={styles.section}
        flex={1}>
        <Flex
          align="center"
          justify="space-between"
          gap={4}
          className={styles.sectionHeader}>
          <Button
            type="text"
            className={styles.sectionTitle}
            onClick={function () {
              updateSectionOpen(function (open) {
                return !open
              })
            }}>
            工作区
          </Button>
          <Button
            type="text"
            className={styles.sectionAdd}
            aria-label="新建工作区"
            icon={
              <Icon
                icon="mdi:plus"
                width={16}
                height={16}
              />
            }
            onClick={function () {
              updateEditingWorkspaceID(null)
              updateFormOpen(true)
            }}
          />
        </Flex>

        {sectionOpen ? (
          branches.length === 0 ? (
            <Empty
              className={styles.empty}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无工作区，点击 + 新建"
            />
          ) : (
            <Collapse
              ghost
              size="small"
              activeKey={expandedKeys}
              onChange={handleCollapseChange}
              className={styles.tree}
              classNames={{
                header: styles.workspaceHeader,
                title: styles.workspaceTitleSlot,
                body: styles.sessionBody,
                icon: styles.expandIcon
              }}
              expandIcon={function (panel) {
                return (
                  <Icon
                    icon={panel.isActive ? 'mdi:chevron-down' : 'mdi:chevron-right'}
                    width={16}
                    height={16}
                  />
                )
              }}
              items={branches.map(function (branch) {
                return {
                  key: branch.id,
                  label: findWorkspaceLabel(branch),
                  extra: findWorkspaceExtra(branch),
                  children: findSessionChildren(branch),
                  className: clsx(
                    styles.branch,
                    activeWorkspaceID === branch.id && styles.workspaceActive
                  )
                }
              })}
            />
          )
        ) : null}
      </Flex>

      <Flex
        align="center"
        justify="space-between"
        gap={8}
        className={styles.profile}>
        <Flex
          align="center"
          gap={8}
          className={styles.profileUser}>
          <Avatar
            size={28}
            src={user?.avatarUrl || undefined}
            icon={
              user?.avatarUrl ? undefined : (
                <Icon
                  icon="ant-design:user-outlined"
                  width={14}
                  height={14}
                />
              )
            }
          />
          <Typography.Text
            ellipsis
            className={styles.profileName}>
            {displayName}
          </Typography.Text>
        </Flex>
        <Dropdown
          trigger={['click']}
          placement="topRight"
          getPopupContainer={props.getPopupContainer}
          menu={settingsMenu}>
          <Button
            type="text"
            aria-label="设置"
            className={styles.profileSettings}
            icon={
              <Icon
                icon="ant-design:setting-outlined"
                width={16}
                height={16}
              />
            }
          />
        </Dropdown>
      </Flex>

      <Modal
        title="重命名会话"
        open={Boolean(renaming)}
        centered
        getContainer={function () {
          return document.body
        }}
        onOk={function () {
          void handleRename()
        }}
        onCancel={function () {
          updateRenaming(null)
        }}>
        <Input
          value={renameValue}
          onChange={function (event) {
            updateRenameValue(event.target.value)
          }}
          onPressEnter={function () {
            void handleRename()
          }}
        />
      </Modal>

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
