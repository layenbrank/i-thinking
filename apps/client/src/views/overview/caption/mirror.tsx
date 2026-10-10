/**
 * 标题栏的镜像入口：切换 + 管理（新建 / 重命名 / 删除）。
 *
 * 取代原 OverviewCapsule 的贴边胶囊（那里还有 gsap 拖拽 + 位置持久化，整套已删）：
 * 入口本来就属于窗口标题栏 —— 常驻可见、不挡内容，也不用 hover 才看得见。
 *
 * 三种形态：
 * - 没有镜像：直接给「新建镜像」（否则没有任何入口能建出第一个）；
 * - 有镜像：**始终可点** —— 多个可切换，单个也能进管理面；
 * - 切换中：触发按钮转 Spinner 并禁用（订阅 `mirror-switch` 的忙态）。
 *
 * 列表交互：↑↓ / Home / End 移动高亮，Enter 切换高亮项，Esc 关闭；「重命名」为行内就地输入
 * （Enter 保存 / Esc 取消 / 失焦保存），「删除」走 AlertDialog 二次确认（删的是当前镜像时
 * 自动切到剩下的第一个）。
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
import { Button } from '@i-thinking/design/components/button'
import { Input } from '@i-thinking/design/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@i-thinking/design/components/popover'
import { Spinner } from '@i-thinking/design/components/spinner'
import { cn } from 'cn'
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { toast } from 'sonner'

import {
  findIsMirrorSwitching,
  requestMirrorSwitch,
  subscribeMirrorSwitching
} from '@/features/controller/mirror-switch'
import { useMirrorStore, type MirrorWrite } from '@/stores/mirror.ts'
import styles from '@/views/overview/caption/caption.module.scss'

/** 新建镜像的默认配置（与迁移里种下的默认镜像同形） */
function buildMirrorWrite(title: string, index: number): MirrorWrite {
  return {
    title,
    index,
    mark: '',
    description: '',
    background: null,
    backdrop: null,
    overlay: ''
  }
}

/** 「镜像-01」这类序号标题；重名顺延，避免建出两个同名 */
function findNextTitle(mirrors: Mirror[]): string {
  for (let n = mirrors.length + 1; n <= mirrors.length + 100; n += 1) {
    const candidate = `镜像-${String(n).padStart(2, '0')}`
    const taken = mirrors.some(function (mirror) {
      return mirror.title === candidate
    })
    if (!taken) return candidate
  }
  return `镜像-${Date.now()}`
}

function MirrorSwitcher() {
  const mirrors = useMirrorStore(function (state) {
    return state.mirrors
  })
  const activeID = useMirrorStore(function (state) {
    return state.active.mirror?.id
  })
  const [isBusy, updateBusy] = useState(findIsMirrorSwitching)
  const [isOpen, updateOpen] = useState(false)
  const [cursor, updateCursor] = useState(0)
  const [renamingID, updateRenamingID] = useState<string | null>(null)
  const [draft, updateDraft] = useState('')
  const [pendingRemove, updatePendingRemove] = useState<Mirror | null>(null)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(function () {
    return subscribeMirrorSwitching(function () {
      updateBusy(findIsMirrorSwitching())
    })
  }, [])

  useEffect(
    function () {
      if (renamingID) renameRef.current?.focus()
    },
    [renamingID]
  )

  const sorted = mirrors.slice().toSorted(function (a, b) {
    return a.index - b.index
  })
  const activeIndex = sorted.findIndex(function (mirror) {
    return mirror.id === activeID
  })
  const active = activeIndex >= 0 ? sorted[activeIndex] : undefined

  function handleOpenChange(next: boolean) {
    updateOpen(next)
    // 打开时把键盘高亮落到当前镜像
    if (next) updateCursor(activeIndex >= 0 ? activeIndex : 0)
    else {
      updateRenamingID(null)
      updateDraft('')
    }
  }

  async function switchTo(id: string) {
    updateOpen(false)
    await requestMirrorSwitch(id)
  }

  async function handleCreate() {
    const write = buildMirrorWrite(findNextTitle(sorted), sorted.length)
    try {
      await useMirrorStore.getState().toInsertMirror([write])
    } catch (error) {
      console.error('[caption-mirror] 新建镜像失败', error)
      toast.error('新建镜像失败')
      return
    }

    const created = useMirrorStore.getState().mirrors.find(function (mirror) {
      return mirror.index === write.index && mirror.title === write.title
    })
    if (created) await switchTo(created.id)
  }

  function startRename(mirror: Mirror) {
    updateRenamingID(mirror.id)
    updateDraft(mirror.title)
  }

  async function commitRename() {
    const id = renamingID
    const title = draft.trim()
    const target = sorted.find(function (mirror) {
      return mirror.id === id
    })
    updateRenamingID(null)
    if (!id || !target || !title || title === target.title) return

    try {
      await useMirrorStore.getState().toUpdateMirror([{ key: id, change: { title } }])
    } catch (error) {
      console.error('[caption-mirror] 重命名失败', error)
      toast.error('重命名失败')
    }
  }

  async function handleRemove(target: Mirror) {
    updatePendingRemove(null)
    try {
      await useMirrorStore.getState().toRemoveMirror([target.id])
    } catch (error) {
      console.error('[caption-mirror] 删除镜像失败', error)
      toast.error('删除镜像失败')
      return
    }

    if (target.id !== activeID) return
    const remaining = useMirrorStore.getState().mirrors[0]
    if (remaining) await switchTo(remaining.id)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (renamingID) return

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      updateCursor(function (current) {
        return (current + step + sorted.length) % sorted.length
      })
      return
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      updateCursor(event.key === 'Home' ? 0 : sorted.length - 1)
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const target = sorted[cursor]
      if (target && target.id !== activeID) void switchTo(target.id)
    }
  }

  // 一个镜像都没有：没有列表可开，直接给新建入口
  if (!active) {
    return (
      <Button
        variant="ghost"
        size="sm"
        data-region="false"
        className={styles.mirrorTrigger}
        disabled={isBusy}
        onClick={function () {
          void handleCreate()
        }}>
        {isBusy ? (
          <Spinner className="size-3.5" />
        ) : (
          <Icon
            icon="lucide:plus"
            aria-hidden
          />
        )}
        新建镜像
      </Button>
    )
  }

  const label = active.description ? `${active.title}：${active.description}` : active.title

  return (
    <>
      <Popover
        open={isOpen}
        onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              data-region="false"
              className={styles.mirrorTrigger}
              aria-label={`镜像：${label}`}
              aria-busy={isBusy || undefined}
              disabled={isBusy}
            />
          }>
          {isBusy ? (
            <Spinner className="size-3.5" />
          ) : (
            <span className={styles.mirrorPage}>{active.index + 1}</span>
          )}
          <span className={styles.mirrorName}>{active.title}</span>
          <Icon
            icon="lucide:chevron-down"
            className={styles.mirrorChevron}
            aria-hidden
          />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          sideOffset={6}
          className={styles.mirrorList}
          onKeyDown={onKeyDown}>
          <div
            role="listbox"
            aria-label="镜像">
            {sorted.map(function (mirror, index) {
              const isActive = mirror.id === activeID
              const isCursor = index === cursor
              const isRenaming = mirror.id === renamingID
              return (
                <div
                  key={mirror.id}
                  role="option"
                  aria-selected={isActive}
                  data-cursor={isCursor ? 'true' : undefined}
                  className={cn(styles.mirrorItem, isActive && styles.mirrorItemActive)}
                  onMouseEnter={function () {
                    updateCursor(index)
                  }}>
                  {isRenaming ? (
                    <Input
                      ref={renameRef}
                      className={styles.mirrorRename}
                      value={draft}
                      aria-label="镜像名称"
                      onChange={function (event) {
                        updateDraft(event.target.value)
                      }}
                      onBlur={function () {
                        void commitRename()
                      }}
                      onKeyDown={function (event) {
                        event.stopPropagation()
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          void commitRename()
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          updateRenamingID(null)
                          updateDraft('')
                        }
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      data-region="false"
                      className={styles.mirrorItemMain}
                      onClick={function () {
                        if (isActive) {
                          updateOpen(false)
                          return
                        }
                        void switchTo(mirror.id)
                      }}>
                      <span className={styles.mirrorItemIndex}>{mirror.index + 1}</span>
                      <span className={styles.mirrorItemText}>
                        <span className={styles.mirrorItemTitle}>{mirror.title}</span>
                        {mirror.description ? (
                          <span className={styles.mirrorItemDesc}>{mirror.description}</span>
                        ) : null}
                      </span>
                      {isActive ? (
                        <Icon
                          icon="lucide:check"
                          className={styles.mirrorItemCheck}
                          aria-hidden
                        />
                      ) : null}
                    </button>
                  )}

                  <span className={styles.mirrorItemTools}>
                    <button
                      type="button"
                      data-region="false"
                      className={styles.mirrorTool}
                      aria-label={`重命名「${mirror.title}」`}
                      onClick={function () {
                        startRename(mirror)
                      }}>
                      <Icon
                        icon="lucide:pencil"
                        aria-hidden
                      />
                    </button>
                    <button
                      type="button"
                      data-region="false"
                      className={cn(styles.mirrorTool, styles.mirrorToolDanger)}
                      aria-label={`删除「${mirror.title}」`}
                      onClick={function () {
                        updatePendingRemove(mirror)
                      }}>
                      <Icon
                        icon="lucide:trash-2"
                        aria-hidden
                      />
                    </button>
                  </span>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            data-region="false"
            className={styles.mirrorCreate}
            onClick={function () {
              void handleCreate()
            }}>
            <Icon
              icon="lucide:plus"
              aria-hidden
            />
            新建镜像
          </button>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={pendingRemove !== null}
        onOpenChange={function (next) {
          if (!next) updatePendingRemove(null)
        }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除镜像</AlertDialogTitle>
            <AlertDialogDescription>
              将删除「{pendingRemove?.title}」及其中的全部磁贴，此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={function () {
                if (pendingRemove) void handleRemove(pendingRemove)
              }}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export { MirrorSwitcher }
