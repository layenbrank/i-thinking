/**
 * 新建 / 编辑工作区：源文件夹（多选，其一主要）+ 名称 + 图标 + 副色
 */
import { Icon } from '@iconify/react/offline'
import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@i-thinking/design/components/dialog'
import { Input } from '@i-thinking/design/components/input'
import { open as dialogOpen } from '@tauri-apps/plugin-dialog'
import { clsx } from 'clsx'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { v4 as UUIDV4 } from 'uuid'

import styles from './workspace-form.module.scss'
import {
  WORKSPACE_COLOR,
  WORKSPACE_COLORS,
  WORKSPACE_ICON,
  WORKSPACE_ICONS,
  findWorkspaceIcon
} from '@/features/agent/model/workspace'
import {
  useAgentStore,
  type AiWorkspace,
  type AiWorkspaceFolder
} from '@/stores/agent.ts'

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
  const isEdit = Boolean(props.workspaceID)
  const workspace = useAgentStore(function (state) {
    if (!props.workspaceID) return null
    return (
      state.workspaces.find(function (item) {
        return item.id === props.workspaceID
      }) ?? null
    )
  })
  const workspaceFolders = useAgentStore(function (state) {
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
      void useAgentStore.getState().toReadWorkspaceFolders(props.workspaceID)
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
        if (
          next.some(function (item) {
            return item.path === path
          })
        ) {
          continue
        }
        next.push({
          id: UUIDV4(),
          path,
          isPrimary: next.length === 0
        })
      }
      if (
        next.length &&
        !next.some(function (item) {
          return item.isPrimary
        })
      ) {
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
      if (
        next.length &&
        !next.some(function (item) {
          return item.isPrimary
        })
      ) {
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
      await useAgentStore
        .getState()
        .toUpdateWorkspace([{ id: props.workspaceID, archivedAt: Date.now() }])
      toast.success('已归档工作区')
      props.onClose()
    } catch (error) {
      console.error(error)
      toast.error('归档失败')
    } finally {
      updateSaving(false)
    }
  }

  async function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) {
      toast.warning('请输入工作区名称')
      return
    }
    updateSaving(true)
    const now = Date.now()
    try {
      const store = useAgentStore.getState()
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
      toast.success(isEdit ? '已保存工作区' : '已创建工作区')
      props.onClose()
    } catch (error) {
      console.error(error)
      toast.error(isEdit ? '保存失败' : '创建失败')
    } finally {
      updateSaving(false)
    }
  }

  const canSubmit = title.trim().length > 0

  return (
    <Dialog
      open={props.open}
      onOpenChange={function (open) {
        if (!open) props.onClose()
      }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑工作区' : '新建工作区'}</DialogTitle>
          <DialogDescription className="sr-only">配置源文件夹、名称、图标与颜色</DialogDescription>
        </DialogHeader>

        <div className={styles.body}>
          <div className={styles.field}>
            <div className="flex items-center justify-between">
              <span className={styles.fieldLabel}>源文件夹</span>
              {draftFolders.length > 0 ? (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto px-0"
                  onClick={function () {
                    void handleAddFolder()
                  }}>
                  <Icon icon="lucide:plus" />
                  添加
                </Button>
              ) : null}
            </div>

            {draftFolders.length === 0 ? (
              <button
                type="button"
                className={styles.dropzone}
                onClick={function () {
                  void handleAddFolder()
                }}>
                <Icon
                  icon="lucide:folder-plus"
                  className="size-7"
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
                        icon="lucide:folder"
                        className={clsx(styles.folderIcon, 'size-4 shrink-0')}
                      />
                      <div className={styles.folderMeta}>
                        <span className={styles.folderName}>{basename(folder.path)}</span>
                        <span className={styles.folderPath}>{folder.path}</span>
                      </div>
                      {folder.isPrimary ? (
                        <Badge variant="secondary">主要</Badge>
                      ) : (
                        <Button
                          variant="link"
                          size="sm"
                          onClick={function () {
                            handlePrimaryFolder(folder.id)
                          }}>
                          设为主要
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label="移除文件夹"
                        onClick={function () {
                          handleRemoveFolder(folder.id)
                        }}>
                        <Icon icon="lucide:x" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className={styles.field}>
            <label
              className={styles.fieldLabel}
              htmlFor="agent-workspace-title">
              工作区名称
            </label>
            <Input
              id="agent-workspace-title"
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
                        icon="lucide:check"
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

        <DialogFooter className="sm:justify-between">
          {isEdit ? (
            <Button
              variant="ghost"
              className="text-destructive"
              disabled={saving}
              onClick={function () {
                void handleArchive()
              }}>
              <Icon icon="lucide:trash-2" />
              归档工作区
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={saving}
              onClick={props.onClose}>
              取消
            </Button>
            <Button
              disabled={saving || !canSubmit}
              onClick={function () {
                void handleSave()
              }}>
              {isEdit ? '保存' : '创建'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { WorkspaceForm }
export type { WorkspaceFormProps }
