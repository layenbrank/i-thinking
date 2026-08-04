import { Root, type ContextMenuProps } from '@/components/contextmenu/contextmenu'
import {
  Host,
  useContextMenu,
  type HostConfig,
  type PresentInput
} from '@/components/contextmenu/host'
import { findFocusable, parseMenuItems } from '@/components/contextmenu/menu'
import type {
  MenuClassNames,
  MenuItem,
  MenuItemKind,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/menu'
import { parseOrigin } from '@/components/contextmenu/position'

const ContextMenu = Object.assign(Root, {
  Host
})

export type {
  ContextMenuProps,
  HostConfig,
  MenuClassNames,
  MenuItem,
  MenuItemKind,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  PresentInput,
  ParsedMenuItem
}

export { ContextMenu, findFocusable, parseMenuItems, parseOrigin, useContextMenu }
