/**
 * 输入区：AgentSender + TriggerPopup + footer / 状态条
 */
import { Icon } from '@iconify/react/offline'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { App, Button, Dropdown, Flex, Popover, Tag, Typography } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'

import {
  AgentSender,
  type AgentSenderHandle
} from '@/features/agent/chat/agent-sender'
import styles from '@/features/agent/chat/composer.module.scss'
import {
  PlusMenuPanel,
  basename,
  rootLabel,
  type PlusCategory,
  type WorkspaceRoot
} from '@/features/agent/chat/plus-menu'
import {
  TriggerPopup,
  type TriggerPopupHandle
} from '@/features/agent/chat/trigger-popup'
import type { TriggerMatch, SenderChip } from '@/features/agent/chat/sender-trigger'
import { savePasteImage } from '@/features/agent/chat/paste-image'
import { AgentModelPicker } from '@/features/agent/layout/model-picker'
import { findScenarioLabel, type ScenarioKey } from '@/features/agent/model/scenarios'
import { isImageFile } from '@/features/agent/model/file-icon'
import { PROVIDER_KIND_META } from '@/features/agent/model/providers'
import { normalizePath } from '@/features/agent/model/workspace-path'
import type { FilePartData } from '@/features/agent/types'
import { WorkspaceGit } from '@/lib/workspace-git'
import { useIntelligenceStore, type AiWorkspaceFolder } from '@/stores/intelligence'
import { useProviderStore } from '@/stores/provider'

interface ComposerProps {
  value: string
  loading: boolean
  scenario: ScenarioKey
  files: FilePartData[]
  getPopupContainer?: (trigger: HTMLElement) => HTMLElement
  onChange: (value: string) => void
  onAttach: (file: FilePartData) => void
  onRemoveFile: (path: string) => void
  onSubmit: (fragment: string, chips?: SenderChip[]) => void
  onCancel: () => void
  onOpenSettings: () => void
}

const EMPTY_FOLDERS: AiWorkspaceFolder[] = []

function matchKey(match: TriggerMatch | null) {
  if (!match) return null
  return `${match.char}:${match.query}:${match.behaviorId}`
}

function AgentComposer(props: ComposerProps) {
  const { message } = App.useApp()
  const [plusOpen, updatePlusOpen] = useState(false)
  const [plusCategory, updatePlusCategory] = useState<PlusCategory>('files')
  const [triggerMatch, updateTriggerMatch] = useState<TriggerMatch | null>(null)
  const [chipPaths, updateChipPaths] = useState<string[]>([])
  const [branch, updateBranch] = useState<string | null>(null)
  const [isRepo, updateIsRepo] = useState(false)
  const [branches, updateBranches] = useState<string[]>([])
  const [branchLoading, updateBranchLoading] = useState(false)
  const [branchOpen, updateBranchOpen] = useState(false)
  const [canSend, updateCanSend] = useState(false)
  const senderRef = useRef<AgentSenderHandle>(null)
  const popupRef = useRef<TriggerPopupHandle>(null)
  const suppressedTriggerKey = useRef<string | null>(null)

  const providers = useProviderStore(function (state) {
    return state.providers
  })
  const activeProviderID = useProviderStore(function (state) {
    return state.activeProviderID
  })
  const workspaces = useIntelligenceStore(function (state) {
    return state.workspaces
  })
  const workspaceFolders = useIntelligenceStore(function (state) {
    return state.workspaceFolders
  })
  const activeWorkspaceID = useIntelligenceStore(function (state) {
    return state.activeWorkspaceID
  })

  const activeWorkspace = workspaces.find(function (item) {
    return item.id === activeWorkspaceID
  })

  const activeFolders = useMemo(
    function () {
      if (!activeWorkspaceID) return EMPTY_FOLDERS
      return workspaceFolders
        .filter(function (folder) {
          return folder.workspaceID === activeWorkspaceID
        })
        .slice()
        .sort(function (a, b) {
          if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
          return a.sort - b.sort
        })
    },
    [activeWorkspaceID, workspaceFolders]
  )

  const roots: WorkspaceRoot[] = useMemo(
    function () {
      return activeFolders.map(function (folder) {
        return {
          id: folder.id,
          path: folder.path,
          label: rootLabel(folder.path)
        }
      })
    },
    [activeFolders]
  )

  const rootPaths = useMemo(
    function () {
      return roots.map(function (item) {
        return item.path
      })
    },
    [roots]
  )

  const primaryPath = activeFolders[0]?.path ?? null

  const activeProvider = providers.find(function (provider) {
    return provider.id === activeProviderID && provider.enabled
  })
  const modelLabel = activeProvider
    ? `${activeProvider.model || '未选模型'} · ${PROVIDER_KIND_META[activeProvider.kind].label}`
    : '选择模型'

  const scenarioLabel = findScenarioLabel(props.scenario)

  const imageFiles = useMemo(
    function () {
      return props.files.filter(function (file) {
        return isImageFile(file.name) || isImageFile(file.path)
      })
    },
    [props.files]
  )

  const otherFiles = useMemo(
    function () {
      return props.files.filter(function (file) {
        return !(isImageFile(file.name) || isImageFile(file.path))
      })
    },
    [props.files]
  )

  useEffect(
    function () {
      if (!primaryPath) return
      let cancelled = false
      void WorkspaceGit.probe(primaryPath)
        .then(function (result) {
          if (cancelled) return
          updateIsRepo(result.isRepo)
          updateBranch(result.branch)
        })
        .catch(function () {
          if (cancelled) return
          updateIsRepo(false)
          updateBranch(null)
        })
      return function () {
        cancelled = true
      }
    },
    [primaryPath]
  )

  const showGit = Boolean(primaryPath && isRepo && branch)

  useEffect(
    function () {
      if (!branchOpen || !primaryPath || !isRepo) return
      let cancelled = false
      void WorkspaceGit.fetchBranches(primaryPath)
        .then(function (result) {
          if (cancelled) return
          updateBranches(result.branches)
          updateBranch(result.current)
        })
        .catch(function (error) {
          if (cancelled) return
          message.error(typeof error === 'string' ? error : '无法加载分支')
        })
      return function () {
        cancelled = true
      }
    },
    [branchOpen, primaryPath, isRepo, message]
  )

  useEffect(
    function () {
      if (props.value !== '') return
      senderRef.current?.clear()
      updateTriggerMatch(null)
      updateChipPaths([])
      updateCanSend(false)
      suppressedTriggerKey.current = null
    },
    [props.value]
  )

  function syncChipPaths() {
    updateChipPaths(senderRef.current?.findChipPaths() ?? [])
  }

  function handleTriggerChange(match: TriggerMatch | null) {
    const key = matchKey(match)
    if (key && key === suppressedTriggerKey.current) {
      updateTriggerMatch(null)
      return
    }
    if (!key) suppressedTriggerKey.current = null
    updateTriggerMatch(match)
  }

  function handleTriggerClose() {
    suppressedTriggerKey.current = matchKey(triggerMatch)
    updateTriggerMatch(null)
  }

  async function handleCheckout(nextBranch: string) {
    if (!primaryPath || nextBranch === branch) {
      updateBranchOpen(false)
      return
    }
    updateBranchLoading(true)
    try {
      const result = await WorkspaceGit.checkout(primaryPath, nextBranch)
      updateBranch(result.branch)
      updateBranchOpen(false)
      message.success(`已切换到 ${result.branch}`)
    } catch (error) {
      message.error(typeof error === 'string' ? error : '切换分支失败')
    } finally {
      updateBranchLoading(false)
    }
  }

  async function handlePickFiles() {
    const selected = await dialogOpen({
      multiple: true,
      title: '添加文件'
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    for (const path of paths) {
      handleAttach({ path: normalizePath(path), name: basename(path) })
    }
  }

  async function handlePickImages() {
    const selected = await dialogOpen({
      multiple: true,
      title: '添加图片',
      filters: [
        {
          name: '图片',
          extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif']
        }
      ]
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    for (const path of paths) {
      handleAttach({ path: normalizePath(path), name: basename(path) })
    }
  }

  function handleAttach(file: FilePartData) {
    const next = { ...file, path: normalizePath(file.path), name: file.name }
    props.onAttach(next)
    updatePlusOpen(false)
    if (isImageFile(next.name) || isImageFile(next.path)) {
      insertImageChip(next)
    }
  }

  function insertImageChip(file: FilePartData) {
    senderRef.current?.insertChip({
      kind: 'file',
      label: file.name,
      value: `@${file.name}`,
      meta: { path: normalizePath(file.path), name: file.name }
    })
    syncChipPaths()
  }

  async function handlePasteImages(files: File[]) {
    for (const file of files) {
      try {
        const part = await savePasteImage(file)
        handleAttach(part)
      } catch (error) {
        message.error(typeof error === 'string' ? error : '粘贴图片失败')
      }
    }
  }

  async function handlePickFolders() {
    const selected = await dialogOpen({
      directory: true,
      multiple: true,
      title: '添加文件夹'
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    for (const path of paths) {
      props.onAttach({ path: normalizePath(path), name: basename(path) })
    }
  }

  const branchItems = branches.map(function (item) {
    return {
      key: item,
      label: (
        <Flex
          align="center"
          justify="space-between"
          gap={12}>
          <span>{item}</span>
          {item === branch ? (
            <Icon
              icon="mdi:check"
              width={14}
              height={14}
            />
          ) : null}
        </Flex>
      ),
      onClick: function () {
        void handleCheckout(item)
      }
    }
  })

  const footer = (
    <Flex
      align="center"
      className={styles.footer}
      gap={6}>
      <Flex
        align="center"
        gap={2}
        className={styles.footerStart}>
        <Popover
          trigger="click"
          placement="topLeft"
          arrow={false}
          open={plusOpen}
          onOpenChange={function (open) {
            updatePlusOpen(open)
            if (open) {
              updatePlusCategory('files')
              handleTriggerClose()
            }
          }}
          getPopupContainer={props.getPopupContainer}
          classNames={{ root: styles.plusPopover }}
          styles={{
            container: {
              padding: 0,
              borderRadius: 0,
              overflow: 'visible',
              border: 'none',
              boxShadow: 'none',
              background: 'transparent'
            }
          }}
          content={
            <PlusMenuPanel
              roots={roots}
              category={plusCategory}
              onCategoryChange={updatePlusCategory}
              onAttach={handleAttach}
            />
          }>
          <Button
            type="text"
            size="small"
            className={styles.footerBtn}
            aria-label="添加"
            icon={<Icon icon="mdi:plus" />}
          />
        </Popover>
        <Popover
          trigger="click"
          placement="topLeft"
          arrow={false}
          getPopupContainer={props.getPopupContainer}
          classNames={{ root: styles.attachPopover }}
          styles={{
            container: {
              padding: 4,
              borderRadius: 8
            }
          }}
          content={
            <Flex
              vertical
              className={styles.attachMenu}>
              <button
                type="button"
                className={styles.attachItem}
                onClick={function () {
                  void handlePickImages()
                }}>
                <Icon
                  icon="mdi:image-outline"
                  width={14}
                  height={14}
                />
                添加图片
              </button>
              <button
                type="button"
                className={styles.attachItem}
                onClick={function () {
                  void handlePickFiles()
                }}>
                <Icon
                  icon="mdi:file-outline"
                  width={14}
                  height={14}
                />
                添加文件
              </button>
              <button
                type="button"
                className={styles.attachItem}
                onClick={function () {
                  void handlePickFolders()
                }}>
                <Icon
                  icon="mdi:folder-outline"
                  width={14}
                  height={14}
                />
                添加文件夹
              </button>
            </Flex>
          }>
          <Button
            type="text"
            size="small"
            className={styles.footerBtn}
            aria-label="附加文件"
            icon={<Icon icon="mdi:paperclip" />}
          />
        </Popover>
      </Flex>
      <Flex
        align="center"
        gap={6}
        className={styles.footerEnd}>
        <AgentModelPicker
          getPopupContainer={props.getPopupContainer}
          onOpenSettings={props.onOpenSettings}>
          <Button
            type="text"
            className={styles.modelBtn}>
            <Icon
              icon="mdi:api"
              width={14}
              height={14}
            />
            <span className={styles.modelLabel}>{modelLabel}</span>
          </Button>
        </AgentModelPicker>
        {props.loading ? (
          <Button
            type="primary"
            danger
            className={styles.sendBtn}
            aria-label="停止"
            onClick={props.onCancel}
            icon={
              <Icon
                icon="mdi:stop"
                width={16}
                height={16}
              />
            }
          />
        ) : (
          <Button
            type="primary"
            className={styles.sendBtn}
            aria-label="发送"
            disabled={!canSend}
            onClick={function () {
              senderRef.current?.submit()
            }}
            icon={
              <Icon
                icon="mdi:arrow-up"
                width={16}
                height={16}
              />
            }
          />
        )}
      </Flex>
    </Flex>
  )

  return (
    <div className={styles.root}>
      <div className={styles.senderShell}>
        <TriggerPopup
          ref={popupRef}
          match={triggerMatch}
          rootPaths={rootPaths}
          excludedPaths={chipPaths}
          onPick={function (chip) {
            senderRef.current?.insertChip(chip)
            const path = chip.meta.path ? normalizePath(chip.meta.path) : ''
            const name = chip.meta.name || chip.label
            if (chip.kind === 'file' && path && name) {
              if (isImageFile(name) || isImageFile(path)) {
                props.onAttach({ path, name })
              }
            }
            syncChipPaths()
            suppressedTriggerKey.current = null
            updateTriggerMatch(null)
          }}
          onClose={handleTriggerClose}
        />
        <AgentSender
          ref={senderRef}
          loading={props.loading}
          blockSubmit={Boolean(triggerMatch)}
          images={imageFiles}
          placeholder={
            props.scenario === 'general'
              ? '输入消息，Enter 发送，Shift+Enter 换行；@ 引用文件，/ 引用技能'
              : `场景：${scenarioLabel}，描述需求后发送`
          }
          autoSize={{ minRows: 1, maxRows: 6 }}
          footer={footer}
          onChange={function (value) {
            props.onChange(value)
            updateCanSend(value.trim().length > 0)
            syncChipPaths()
          }}
          onSubmit={function (value) {
            props.onSubmit(value, senderRef.current?.findChips() ?? [])
          }}
          onRemoveImage={function (path) {
            senderRef.current?.removeChipByPath(path)
            props.onRemoveFile(path)
          }}
          onPasteImages={function (files) {
            void handlePasteImages(files)
          }}
          onTriggerChange={handleTriggerChange}
          onTriggerKeyDown={function (event) {
            return popupRef.current?.handleKeyDown(event) ?? false
          }}
        />
      </div>
      {otherFiles.length > 0 ? (
        <div className={styles.files}>
          {otherFiles.map(function (file) {
            return (
              <Tag
                key={normalizePath(file.path)}
                className={styles.fileTag}
                closable
                onClose={function () {
                  props.onRemoveFile(file.path)
                }}>
                {file.name}
              </Tag>
            )
          })}
        </div>
      ) : null}
      {activeWorkspace ? (
        <Flex
          align="center"
          justify="flex-start"
          className={styles.status}
          wrap="wrap">
          {showGit ? (
            <Dropdown
              trigger={['click']}
              open={branchOpen}
              onOpenChange={updateBranchOpen}
              menu={{ items: branchItems }}
              getPopupContainer={props.getPopupContainer}>
              <button
                type="button"
                className={styles.branchBtn}
                disabled={branchLoading}
                aria-label="切换分支">
                <Icon
                  icon="mdi:source-branch"
                  width={12}
                  height={12}
                />
                <span className={styles.statusText}>{branch}</span>
                <Icon
                  icon="mdi:chevron-down"
                  width={12}
                  height={12}
                />
              </button>
            </Dropdown>
          ) : null}
          <span className={styles.statusItem}>
            <Icon
              icon="mdi:folder-outline"
              width={12}
              height={12}
            />
            <Typography.Text
              ellipsis
              className={styles.statusText}>
              {activeWorkspace.title}
            </Typography.Text>
          </span>
          <span className={styles.statusItem}>
            <Icon
              icon="mdi:monitor"
              width={12}
              height={12}
            />
            <span className={styles.statusText}>本地</span>
          </span>
        </Flex>
      ) : null}
    </div>
  )
}

export { AgentComposer }
export type { ComposerProps }
