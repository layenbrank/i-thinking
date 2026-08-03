/**
 * Mirror 磁贴网格 Sortable
 *
 * - delay 后 onChoose：不 pause 滚动
 * - 真实拖拽 onStart 才 pause；仅曾拖动时 onEnd 才 resume
 * - overlay / skeleton 禁拖；入场由 Motion 拥有，不与 gsap 抢 surface
 */
import Sortable from 'sortablejs'

import { clearGhost } from '@/features/controller/lib/scroll-fx'

const DRAG_DELAY = 50
const DRAG_DISTANCE = 10

type SortableOptions = {
  isDisabled?: () => boolean
  onDragStart?: () => void
  onDragEnd?: () => void
  /** Sortable 挪动 DOM 后的 data-id 序（随后会还原给 React） */
  onReorder?: (ids: string[]) => void
}

type SortableSession = {
  sortable: Sortable
  disable(isDisabled: boolean): void
  destroy(): void
}

/**
 * Sortable 在 closest(draggable) 未命中时仍会调用 filter，此时 target 为 null
 *（例如点在 grid gap / padding）。统一在此判定，避免散落 null 检查。
 */
function isDragBlocked(
  target: HTMLElement | null | undefined,
  isDisabled?: () => boolean
) {
  if (isDisabled?.()) return true
  if (!target) return true
  if (target.closest('.magnetic-tile-skeleton')) return true
  return target.closest('[data-overlay-open="true"]') != null
}

function bindSortable(
  container: HTMLElement,
  options: SortableOptions = {}
): SortableSession {
  let isDragging = false

  const sortable = Sortable.create(container, {
    animation: 150,
    draggable: '.magnetic-tile',
    dataIdAttr: 'data-id',
    delay: DRAG_DELAY,
    delayOnTouchOnly: false,
    touchStartThreshold: DRAG_DISTANCE,
    forceFallback: true,
    fallbackOnBody: true,
    fallbackTolerance: 3,
    ghostClass: 'magnetic-tile-ghost',
    chosenClass: 'magnetic-tile-chosen',
    dragClass: 'magnetic-tile-drag',
    filter(_evt, target) {
      return isDragBlocked(target, options.isDisabled)
    },
    preventOnFilter: true,
    onStart(evt) {
      isDragging = true
      evt.item.classList.add('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.add('dragging')
      options.onDragStart?.()
    },
    onEnd(evt) {
      const wasDragging = isDragging
      isDragging = false
      evt.item.classList.remove('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.remove('dragging')
      clearGhost(dragEl)

      const from = evt.oldIndex
      const to = evt.newIndex

      // 先采序、还原 DOM、乐观落库，最后 resume，避免入场/滚动连刷
      if (from != null && to != null && from !== to) {
        const ids = sortable.toArray()
        const parent = evt.from
        const item = evt.item
        const children = parent.children
        if (from < to) {
          parent.insertBefore(item, children[from] ?? null)
        } else {
          parent.insertBefore(item, children[from + 1] ?? null)
        }
        if (ids.length) options.onReorder?.(ids)
      }

      if (wasDragging) options.onDragEnd?.()
    }
  })

  return {
    sortable,
    disable(isDisabled) {
      sortable.option('disabled', isDisabled)
    },
    destroy() {
      sortable.destroy()
    }
  }
}

function move<T>(items: readonly T[], from: number, to: number): T[] {
  if (from === to) return items.slice()
  if (from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return items.slice()
  }
  const next = items.slice()
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

function reorder<T extends { id: string }>(items: readonly T[], ids: string[]): T[] {
  const byId = new Map(
    items.map(function (item) {
      return [item.id, item] as const
    })
  )
  const next: T[] = []
  const used = new Set<string>()

  for (const id of ids) {
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

export { bindSortable, move, reorder }
export type { SortableOptions, SortableSession }
