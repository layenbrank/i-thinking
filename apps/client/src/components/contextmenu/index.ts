import { Root, type ContextMenuProps } from '@/components/contextmenu/contextmenu'
import {
  Host,
  useContextMenu,
  type HostConfig,
  type OpenPayload
} from '@/components/contextmenu/host'
import { findFocusable, parseMenuItems } from '@/components/contextmenu/parse'
import { parseOrigin } from '@/components/contextmenu/position'
import type {
  MenuClassNames,
  MenuItem,
  MenuItemKind,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/types'

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
  OpenPayload,
  ParsedMenuItem
}

export { ContextMenu, findFocusable, parseMenuItems, parseOrigin, useContextMenu }
