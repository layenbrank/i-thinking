import { Root, type ContextMenuProps } from './contextmenu'
import { Host } from './host'
import {
  useContextMenu,
  type HostConfig,
  type PresentInput
} from './host-store'
import { findFocusable, parseMenuItems } from './menu'
import type {
  MenuClassNames,
  MenuItem,
  MenuItemKind,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from './menu'
import { parseOrigin } from './position'

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
