/**
 * 新建 / 编辑工作区：源文件夹（多选，其一主要）+ 名称 + 图标 + 副色
 */
import { Icon } from '@iconify/react/offline'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { App, Button, Flex, Input, Modal, Space, Tag } from 'antd'
import { clsx } from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { v4 as UUIDV4 } from 'uuid'

import styles from '@/features/agent/layout/workspace-form.module.scss'
import {
  WORKSPACE_COLOR,
  WORKSPACE_COLORS,
  WORKSPACE_ICON,
  WORKSPACE_ICONS,
  findWorkspaceIcon
} from '@/features/agent/model/workspace'
import {
  useIntelligenceStore,
  type AiWorkspace,
  type AiWorkspaceFolder
} from '@/stores/intelligence.ts'

interface FolderDraft {
  id: string
  path: string
  isPrimary: boolean
}

interface WorkspaceFormProps {
  open: boolean
  workspaceID?: string | null
  onClose: () => void
}

const EMPTY_FOLDERS: AiWorkspaceFolder[] = []

function basename(path: string) {
  const parts = path.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || path
}

function WorkspaceForm(props: WorkspaceFormProps) {
  const { message } = App.useApp()
  const isEdit = Boolean(props.workspaceID)
  const workspace = useIntelligenceStore(function (state) {
    if (!props.workspaceID) return null
    return (
      state.workspaces.find(function (item) {
        return item.id === props.workspaceID
      }) ?? null
    )
  })
  const workspaceFolders = useIntelligenceStore(function (state) {
    return state.workspaceFolders
  })
  const folders = useMemo(
    function () {
      if (!props.workspaceID) return EMPTY_FOLDERS
      return workspaceFolders.filter(function (item) {
        return item.workspaceID === props.workspaceID
      })
    },
    [props.workspaceID, workspaceFolders]
  )

  const [title, updateTitle] = useState('')
  const [icon, updateIcon] = useState(WORKSPACE_ICON)
  const [color, updateColor] = useState(WORKSPACE_COLOR)
  const [draftFolders, updateDraftFolders] = useState<FolderDraft[]>([])
  const [saving, updateSaving] = useState(false)

  useEffect(
    function () {
      if (!props.open || !props.workspaceID) return
      void useIntelligenceStore.getState().toReadWorkspaceFolders(props.workspaceID)
    },
    [props.open, props.workspaceID]
  )

  useEffect(
    function () {
      if (!props.open) return
      if (isEdit && workspace) {
        updateTitle(workspace.title)
        updateIcon(workspace.icon || WORKSPACE_ICON)
        updateColor(workspace.color || WORKSPACE_COLOR)
        updateDraftFolders(
          folders.map(function (folder) {
            return {
              id: folder.id,
              path: folder.path,
              isPrimary: folder.isPrimary
            }
          })
        )
        return
      }
      if (!isEdit) {
        updateTitle('')
        updateIcon(WORKSPACE_ICON)
        updateColor(WORKSPACE_COLOR)
        updateDraftFolders([])
      }
    },
    [props.open, props.workspaceID, isEdit, workspace, folders]
  )

  async function handleAddFolder() {
    const selected = await dialogOpen({
      directory: true,
      multiple: true,
      title: '选择可读写文件夹'
    })
    if (!selected) return
    const paths = Array.isArray(selected) ? selected : [selected]
    updateDraftFolders(function (prev) {
      const next = [...prev]
      for (const path of paths) {
        if (next.some(function (item) {
          return item.path === path
        })) {
          continue
        }
        next.push({
          id: UUIDV4(),
          path,
          isPrimary: next.length === 0
        })
      }
      if (next.length && !next.some(function (item) {
        return item.isPrimary
      })) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  function handleRemoveFolder(id: string) {
    updateDraftFolders(function (prev) {
      const next = prev.filter(function (item) {
        return item.id !== id
      })
      if (next.length && !next.some(function (item) {
        return item.isPrimary
      })) {
        next[0].isPrimary = true
      }
      return next
    })
  }

  function handlePrimaryFolder(id: string) {
    updateDraftFolders(function (prev) {
      return prev.map(function (item) {
        return { ...item, isPrimary: item.id === id }
      })
    })
  }

  async function handleArchive() {
    if (!props.workspaceID) return
    updateSaving(true)
    try {
      await useIntelligenceStore.getState().toUpdateWorkspace([
        { id: props.workspaceID, archivedAt: Date.now() }
      ])
      message.success('已归档工作区')
      props.onClose()
    } catch (error) {
      console.error(error)
      message.error('归档失败')
    } finally {
      updateSaving(false)
    }
  }

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) {
      message.warning('请输入工作区名称')
      return
    }
    updateSaving(true)
    const now = Date.now()
    try {
      const store = useIntelligenceStore.getState()
      let workspaceID = props.workspaceID ?? UUIDV4()

      if (isEdit && props.workspaceID) {
        await store.toUpdateWorkspace([
          {
            id: props.workspaceID,
            title: trimmed,
            icon,
            color
          }
        ])
        workspaceID = props.workspaceID
      } else {
        const row: AiWorkspace = {
          id: workspaceID,
          title: trimmed,
          icon,
          color,
          pinned: false,
          archivedAt: null,
          createdAt: now,
          updatedAt: now
        }
        await store.toWriteWorkspace([row])
        store.toActivateWorkspace(workspaceID)
      }

      const nextFolders: AiWorkspaceFolder[] = draftFolders.map(function (folder, index) {
        return {
          id: folder.id,
          workspaceID,
          path: folder.path,
          isPrimary: folder.isPrimary,
          sort: index,
          createdAt: now,
          updatedAt: now
        }
      })
      await store.toReplaceWorkspaceFolders(workspaceID, nextFolders)
      message.success(isEdit ? '已保存工作区' : '已创建工作区')
      props.onClose()
    } catch (error) {
      console.error(error)
      message.error(isEdit ? '保存失败' : '创建失败')
    } finally {
      updateSaving(false)
    }
  }

  const canSubmit = title.trim().length > 0

  return (
    <Modal
      title={isEdit ? '编辑工作区' : '新建工作区'}
      open={props.open}
      onCancel={props.onClose}
      centered
      width={520}
      destroyOnHidden
      getContainer={function () {
        return document.body
      }}
      footer={
        <Flex
          justify={isEdit ? 'space-between' : 'flex-end'}
          align="center">
          {isEdit ? (
            <Button
              type="link"
              danger
              disabled={saving}
              icon={<Icon icon="ant-design:delete-outlined" width={14} height={14} />}
              onClick={function () {
                void handleArchive()
              }}>
              归档工作区
            </Button>
          ) : (
            <span />
          )}
          <Space>
            <Button
              onClick={props.onClose}
              disabled={saving}>
              取消
            </Button>
            <Button
              type="primary"
              loading={saving}
              disabled={!canSubmit}
              onClick={function () {
                void handleSave()
              }}>
              {isEdit ? '保存' : '创建'}
            </Button>
          </Space>
        </Flex>
      }>
      <div className={styles.body}>
        <div className={styles.field}>
          <Flex
            justify="space-between"
            align="center"
            className={styles.fieldLabel}>
            <span>源文件夹</span>
            {draftFolders.length > 0 ? (
              <Button
                type="link"
                size="small"
                onClick={function () {
                  void handleAddFolder()
                }}>
                + 添加
              </Button>
            ) : null}
          </Flex>

          {draftFolders.length === 0 ? (
            <button
              type="button"
              className={styles.dropzone}
              onClick={function () {
                void handleAddFolder()
              }}>
              <Icon
                icon="ant-design:folder-add-outlined"
                width={28}
                height={28}
              />
              <span>点击添加可读写文件夹</span>
            </button>
          ) : (
            <ul className={styles.folderList}>
              {draftFolders.map(function (folder) {
                return (
                  <li
                    key={folder.id}
                    className={clsx(styles.folderItem, folder.isPrimary && styles.folderPrimary)}>
                    <Icon
                      icon="ant-design:folder-outlined"
                      width={16}
                      height={16}
                      className={styles.folderIcon}
                    />
                    <div className={styles.folderMeta}>
                      <span className={styles.folderName}>{basename(folder.path)}</span>
                      <span className={styles.folderPath}>{folder.path}</span>
                    </div>
                    {folder.isPrimary ? (
                      <Tag
                        color="processing"
                        className={styles.primaryTag}>
                        主要
                      </Tag>
                    ) : (
                      <Button
                        type="link"
                        size="small"
                        onClick={function () {
                          handlePrimaryFolder(folder.id)
                        }}>
                        设为主要
                      </Button>
                    )}
                    <Button
                      type="text"
                      size="small"
                      aria-label="移除文件夹"
                      icon={<Icon icon="ant-design:close-outlined" width={12} height={12} />}
                      onClick={function () {
                        handleRemoveFolder(folder.id)
                      }}
                    />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>工作区名称</div>
          <Input
            placeholder="输入名称..."
            value={title}
            onChange={function (event) {
              updateTitle(event.target.value)
            }}
          />
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>工作区图标</div>
          <div className={styles.iconGrid}>
            {WORKSPACE_ICONS.map(function (item) {
              return (
                <button
                  key={item.key}
                  type="button"
                  className={clsx(styles.iconCell, icon === item.key && styles.iconActive)}
                  aria-label={item.key}
                  onClick={function () {
                    updateIcon(item.key)
                  }}>
                  <Icon
                    icon={item.icon}
                    width={18}
                    height={18}
                  />
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.fieldLabel}>工作区副色</div>
          <div className={styles.colorRow}>
            {WORKSPACE_COLORS.map(function (swatch) {
              return (
                <button
                  key={swatch}
                  type="button"
                  className={clsx(styles.colorSwatch, color === swatch && styles.colorActive)}
                  style={{ background: swatch }}
                  aria-label={swatch}
                  onClick={function () {
                    updateColor(swatch)
                  }}>
                  {color === swatch ? (
                    <Icon
                      icon="ant-design:check-outlined"
                      width={12}
                      height={12}
                    />
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>

        <div className={styles.preview}>
          <span
            className={styles.previewDot}
            style={{ background: color }}
          />
          <Icon
            icon={findWorkspaceIcon(icon)}
            width={14}
            height={14}
          />
          <span>{title.trim() || '工作区预览'}</span>
        </div>
      </div>
    </Modal>
  )
}

export { WorkspaceForm }
export type { WorkspaceFormProps }
