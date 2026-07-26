import { AnimatePresence } from 'motion/react'
import {
  createElement,
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore
} from 'react'
import { createPortal } from 'react-dom'

import {
  ContextMenuOverlay,
  findDefaultContainer,
  type ContextMenuProps
} from '@/components/contextmenu/contextmenu'
import {
  findFocusableItems,
  parseItems,
  type ContextMenuClickInfo,
  type ContextMenuItem,
  type ParsedContextMenuItem
} from '@/components/contextmenu/parse-items'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'

type HostConfig = Omit<ContextMenuProps, 'children' | 'items' | 'open' | 'onOpenChange'> & {
  items?: ContextMenuItem[]
}

interface OpenPayload extends HostConfig {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface StoreState {
  open: boolean
  session: number
  anchor: Point
  items: ParsedContextMenuItem[]
  config: HostConfig
}

type Listener = () => void

const LISTENERS = new Set<Listener>()

let STORE: StoreState = {
  open: false,
  session: 0,
  anchor: { x: 0, y: 0 },
  items: [],
  config: {}
}

function emit() {
  for (const listener of LISTENERS) {
    listener()
  }
}

function subscribe(listener: Listener) {
  LISTENERS.add(listener)
  return function () {
    LISTENERS.delete(listener)
  }
}

function findSnapshot() {
  return STORE
}

function openMenu(payload: OpenPayload) {
  const { x, y, items, ...config } = payload
  const parsed = parseItems(items)
  STORE = {
    open: true,
    session: STORE.session + 1,
    anchor: { x, y },
    items: parsed,
    config
  }
  emit()
}

function closeMenu() {
  if (!STORE.open) return
  STORE = {
    ...STORE,
    open: false
  }
  emit()
}

function resetMenu() {
  STORE = {
    open: false,
    session: STORE.session,
    anchor: { x: 0, y: 0 },
    items: [],
    config: {}
  }
  emit()
}

function useContextMenu() {
  const open = useCallback(function (payload: OpenPayload) {
    openMenu(payload)
  }, [])

  const close = useCallback(function () {
    closeMenu()
  }, [])

  return { open, close }
}

function Host() {
  const state = useSyncExternalStore(subscribe, findSnapshot, findSnapshot)
  const [openPath, setOpenPath] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>()

  const container = (state.config.findPopupContainer ?? findDefaultContainer)()

  useEffect(
    function () {
      if (!state.open) return
      const focusable = findFocusableItems(state.items)
      setOpenPath([])
      setActiveKey(focusable[0]?.key)
    },
    [state.session, state.open]
  )

  useEffect(
    function () {
      if (!state.open) return

      function onPointerDown(event: MouseEvent) {
        const target = event.target as Node | null
        if (!target) return
        const panels = document.querySelectorAll('.contextmenu-panel')
        for (const panel of panels) {
          if (panel.contains(target)) return
        }
        closeMenu()
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') closeMenu()
      }

      function onResize() {
        closeMenu()
      }

      document.addEventListener('mousedown', onPointerDown, true)
      document.addEventListener('keydown', onKeyDown, true)
      window.addEventListener('resize', onResize)
      return function () {
        document.removeEventListener('mousedown', onPointerDown, true)
        document.removeEventListener('keydown', onKeyDown, true)
        window.removeEventListener('resize', onResize)
      }
    },
    [state.open]
  )

  function onItemClick(info: ContextMenuClickInfo) {
    state.config.onClick?.(info)
    closeMenu()
  }

  const overlay = state.open
    ? createElement(ContextMenuOverlay, {
        key: `contextmenu-host-${state.session}`,
        overlay: { anchor: state.anchor, items: state.items },
        openPath,
        activeKey,
        classNames: state.config.classNames,
        styles: state.config.styles,
        motion: state.config.motion,
        offset: state.config.offset,
        submenuOffset: state.config.submenuOffset,
        boundaryPadding: state.config.boundaryPadding ?? VIEWPORT_PADDING,
        submenuOpenDelay: state.config.submenuOpenDelay,
        submenuCloseDelay: state.config.submenuCloseDelay,
        container,
        renderItem: state.config.renderItem,
        renderPanel: state.config.renderPanel,
        onOpenPathChange: setOpenPath,
        onActiveKeyChange: setActiveKey,
        onItemClick,
        onRequestClose: closeMenu
      })
    : null

  return createPortal(
    createElement(AnimatePresence, {
      onExitComplete: function () {
        setOpenPath([])
        setActiveKey(undefined)
        resetMenu()
      },
      children: overlay
    }),
    container
  )
}

export type { OpenPayload, HostConfig }
export { useContextMenu, Host, openMenu, closeMenu, resetMenu }
