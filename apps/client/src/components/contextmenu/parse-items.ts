import type { TargetAndTransition, Transition } from 'motion/react'
import type { CSSProperties, ReactNode, MouseEvent as ReactMouseEvent } from 'react'

type ContextMenuItemKind = 'item' | 'divider' | 'group'

interface ContextMenuClickInfo {
  key: string
  keyPath: string[]
  domEvent: ReactMouseEvent | KeyboardEvent
  item: ContextMenuItem
}

interface ContextMenuItem {
  key?: string
  type?: ContextMenuItemKind
  label?: ReactNode
  icon?: ReactNode
  shortcut?: ReactNode
  extra?: ReactNode
  danger?: boolean
  disabled?: boolean
  children?: ContextMenuItem[]
  className?: string
  style?: CSSProperties
  onClick?: (info: ContextMenuClickInfo) => void
}

interface ContextMenuClassNames {
  root?: string
  panel?: string
  item?: string
  icon?: string
  label?: string
  shortcut?: string
  arrow?: string
  submenu?: string
  divider?: string
  group?: string
  groupTitle?: string
}

interface ContextMenuStyles {
  root?: CSSProperties
  panel?: CSSProperties
  item?: CSSProperties
  icon?: CSSProperties
  label?: CSSProperties
  shortcut?: CSSProperties
  arrow?: CSSProperties
  submenu?: CSSProperties
  divider?: CSSProperties
  group?: CSSProperties
  groupTitle?: CSSProperties
}

interface ContextMenuMotionSlot {
  initial?: TargetAndTransition
  animate?: TargetAndTransition
  exit?: TargetAndTransition
  transition?: Transition
}

interface ContextMenuMotion {
  panel?: ContextMenuMotionSlot
  submenu?: ContextMenuMotionSlot
}

interface ParsedContextMenuItem extends ContextMenuItem {
  key: string
  type: ContextMenuItemKind
  children?: ParsedContextMenuItem[]
}

function parseItemKind(item: ContextMenuItem): ContextMenuItemKind {
  if (item.type) return item.type
  if (item.children && item.children.length > 0 && item.label && !item.key) {
    return 'group'
  }
  return 'item'
}

function parseItems(items: ContextMenuItem[], pathPrefix = ''): ParsedContextMenuItem[] {
  return items.map(function (item, index) {
    const kind = parseItemKind(item)
    const key =
      item.key ??
      (kind === 'divider' ? `${pathPrefix}divider-${index}` : `${pathPrefix}item-${index}`)
    const children = item.children ? parseItems(item.children, `${key}.`) : undefined

    return {
      ...item,
      key,
      type: kind,
      children
    }
  })
}

function findFocusableItems(items: ParsedContextMenuItem[]): ParsedContextMenuItem[] {
  const result: ParsedContextMenuItem[] = []

  function walk(nodes: ParsedContextMenuItem[]) {
    for (const node of nodes) {
      if (node.type === 'divider') continue
      if (node.type === 'group') {
        if (node.children) walk(node.children)
        continue
      }
      if (!node.disabled) result.push(node)
    }
  }

  walk(items)
  return result
}

export type {
  ContextMenuItemKind,
  ContextMenuClickInfo,
  ContextMenuItem,
  ContextMenuClassNames,
  ContextMenuStyles,
  ContextMenuMotionSlot,
  ContextMenuMotion,
  ParsedContextMenuItem
}

export { parseItems, findFocusableItems }
