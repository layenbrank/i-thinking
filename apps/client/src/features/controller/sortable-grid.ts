/**
 * Mirror 磁贴网格 Sortable 绑定
 *
 * - delay 后 onChoose：清单块 transform，不 pause 滚动（避免短按/双击卡死景深）
 * - 真实拖拽 onStart 才 pause；onEnd / onUnchoose 必 resume
 * - data-overlay-open 仅 filter 禁拖，与滚动特效零耦合
 */
import Sortable from 'sortablejs'

import { clearDragGhost, clearTileFx } from '@/lib/tile-scroll-fx'

const DELAY_MS = 50
const DISTANCE_PX = 10

type SortableGridOptions = {
  isDisabled?: () => boolean
  /** 真实拖拽开始（onStart） */
  onDragStart?: () => void
  /** 拖拽结束或取消选择（onEnd / onUnchoose） */
  onDragEnd?: () => void
  /** 按 data-id 顺序重排（捕获 Sortable 挪动后的 DOM 序，再还原） */
  onReorder?: (orderedIds: string[]) => void
}

type SortableGridSession = {
  sortable: Sortable
  updateDisabled: (isDisabled: boolean) => void
  destroy: () => void
}

/** Overlay 打开时禁拖该磁贴（蒙层隔离交互；不碰 scroll fx） */
function isOverlayLocked(el: HTMLElement) {
  return el.closest('[data-overlay-open="true"]') != null
}

function bindSortableGrid(
  container: HTMLElement,
  options: SortableGridOptions = {}
): SortableGridSession {
  let isDragging = false

  const sortable = Sortable.create(container, {
    animation: 150,
    draggable: '.magnetic-tile',
    dataIdAttr: 'data-id',
    delay: DELAY_MS,
    delayOnTouchOnly: false,
    touchStartThreshold: DISTANCE_PX,
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    ghostClass: 'magnetic-tile-ghost',
    chosenClass: 'magnetic-tile-chosen',
    dragClass: 'magnetic-tile-drag',
    filter(_evt, target) {
      if (options.isDisabled?.()) return true
      const el = target as HTMLElement
      if (el.closest('.magnetic-tile-skeleton')) return true
      return isOverlayLocked(el)
    },
    preventOnFilter: true,
    onChoose(evt) {
      // 仅清单块动效，避免与即将可能发生的拖拽 transform 冲突；不 pause 全局滚动
      clearTileFx(evt.item)
    },
    onStart(evt) {
      isDragging = true
      evt.item.classList.add('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.add('dragging')
      options.onDragStart?.()
    },
    onUnchoose() {
      // 短按/双击：choose 后松开未拖拽 → 无 onEnd，这里恢复滚动能力
      if (isDragging) return
      options.onDragEnd?.()
    },
    onEnd(evt) {
      isDragging = false
      evt.item.classList.remove('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.remove('dragging')
      clearDragGhost(dragEl)

      const oldIndex = evt.oldIndex
      const newIndex = evt.newIndex
      options.onDragEnd?.()

      if (oldIndex == null || newIndex == null || oldIndex === newIndex) return

      // Sortable 已挪动 DOM：先读 data-id 序，再还原给 React
      const orderedIds = Array.from(evt.from.children)
        .map(function (node) {
          return (node as HTMLElement).dataset.id
        })
        .filter(function (id): id is string {
          return Boolean(id)
        })

      const parent = evt.from
      const item = evt.item
      const children = parent.children
      if (oldIndex < newIndex) {
        parent.insertBefore(item, children[oldIndex] ?? null)
      } else {
        parent.insertBefore(item, children[oldIndex + 1] ?? null)
      }

      if (orderedIds.length) options.onReorder?.(orderedIds)
    }
  })

  return {
    sortable,
    updateDisabled(isDisabled) {
      sortable.option('disabled', isDisabled)
    },
    destroy() {
      sortable.destroy()
    }
  }
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to) return items.slice()
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) return items.slice()
  const next = items.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function reorderByIds<T extends { id: string }>(items: readonly T[], orderedIds: string[]): T[] {
  const byId = new Map(
    items.map(function (item) {
      return [item.id, item] as const
    })
  )
  const next: T[] = []
  const used = new Set<string>()

  for (const id of orderedIds) {
    const item = byId.get(id)
    if (!item || used.has(id)) continue
    used.add(id)
    next.push(item)
  }

  for (const item of items) {
    if (used.has(item.id)) continue
    next.push(item)
  }

  return next
}

export { bindSortableGrid, moveItem, reorderByIds, DELAY_MS, DISTANCE_PX }
export type { SortableGridOptions, SortableGridSession }
