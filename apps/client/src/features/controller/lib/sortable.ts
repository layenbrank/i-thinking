/**
 * Mirror 磁贴网格 Sortable
 *
 * - delay 后 onChoose：清单块 transform，不 pause 滚动
 * - 真实拖拽 onStart 才 pause；onEnd / onUnchoose 必 resume
 * - overlay 打开时禁拖，与 scroll-fx 零耦合
 */
import Sortable from 'sortablejs'

import { clearFx, clearGhost } from '@/features/controller/lib/scroll-fx'

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

function isLocked(el: HTMLElement) {
  return el.closest('[data-overlay-open="true"]') != null
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
      if (options.isDisabled?.()) return true
      const el = target as HTMLElement
      if (el.closest('.magnetic-tile-skeleton')) return true
      return isLocked(el)
    },
    preventOnFilter: true,
    onChoose(evt) {
      clearFx(evt.item)
    },
    onStart(evt) {
      isDragging = true
      evt.item.classList.add('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.add('dragging')
      options.onDragStart?.()
    },
    onUnchoose() {
      if (isDragging) return
      options.onDragEnd?.()
    },
    onEnd(evt) {
      isDragging = false
      evt.item.classList.remove('dragging')
      const dragEl = document.querySelector('.magnetic-tile-drag') as HTMLElement | null
      if (dragEl) dragEl.classList.remove('dragging')
      clearGhost(dragEl)

      const from = evt.oldIndex
      const to = evt.newIndex
      options.onDragEnd?.()

      if (from == null || to == null || from === to) return

      const ids = Array.from(evt.from.children)
        .map(function (node) {
          return (node as HTMLElement).dataset.id
        })
        .filter(function (id): id is string {
          return Boolean(id)
        })

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
