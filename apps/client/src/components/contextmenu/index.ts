import {
  Provider,
  type ContextMenuProps
} from '@/components/contextmenu/contextmenu'
import {
  Host,
  useContextMenu,
  type HostConfig,
  type OpenPayload
} from '@/components/contextmenu/use-context-menu'
import type {
  ContextMenuClassNames,
  ContextMenuClickInfo,
  ContextMenuItem,
  ContextMenuItemKind,
  ContextMenuMotion,
  ContextMenuStyles,
  ParsedContextMenuItem
} from '@/components/contextmenu/parse-items'
import { parseItems, findFocusableItems } from '@/components/contextmenu/parse-items'
import { parsePopupOrigin } from '@/components/contextmenu/position'

const ContextMenu = Object.assign(Provider, {
  Host
})

export type {
  ContextMenuProps,
  ContextMenuClassNames,
  ContextMenuClickInfo,
  ContextMenuItem,
  ContextMenuItemKind,
  ContextMenuMotion,
  ContextMenuStyles,
  ParsedContextMenuItem,
  HostConfig,
  OpenPayload
}

export {
  ContextMenu,
  useContextMenu,
  parseItems,
  findFocusableItems,
  parsePopupOrigin
}
