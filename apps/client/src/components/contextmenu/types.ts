import type { TargetAndTransition, Transition } from 'motion/react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode
} from 'react'

type MenuItemKind = 'item' | 'divider' | 'group'

interface MenuSelectInfo {
  key: string
  keyPath: string[]
  event: ReactPointerEvent | ReactKeyboardEvent | KeyboardEvent
  item: MenuItem
}

interface MenuItem {
  key?: string
  type?: MenuItemKind
  label?: ReactNode
  icon?: ReactNode
  shortcut?: ReactNode
  danger?: boolean
  disabled?: boolean
  children?: MenuItem[]
  className?: string
  style?: CSSProperties
  onSelect?: (info: MenuSelectInfo) => void
}

interface MenuClassNames {
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

interface MenuStyles {
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

interface MenuMotionSlot {
  initial?: TargetAndTransition
  animate?: TargetAndTransition
  exit?: TargetAndTransition
  transition?: Transition
}

interface MenuMotion {
  panel?: MenuMotionSlot
  submenu?: MenuMotionSlot
}

interface ParsedMenuItem extends MenuItem {
  key: string
  type: MenuItemKind
  children?: ParsedMenuItem[]
}

export type {
  MenuItemKind,
  MenuSelectInfo,
  MenuItem,
  MenuClassNames,
  MenuStyles,
  MenuMotionSlot,
  MenuMotion,
  ParsedMenuItem
}
