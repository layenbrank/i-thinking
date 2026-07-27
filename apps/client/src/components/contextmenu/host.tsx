import { AnimatePresence } from 'motion/react'
import { createElement, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import {
  findDefaultContainer,
  MenuLayer,
  type ContextMenuProps
} from '@/components/contextmenu/contextmenu'
import { useDismiss } from '@/components/contextmenu/dismiss'
import { findFocusable, parseMenuItems } from '@/components/contextmenu/parse'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'
import type { MenuItem, MenuSelectInfo, ParsedMenuItem } from '@/components/contextmenu/types'

type HostConfig = Omit<ContextMenuProps, 'children' | 'items' | 'open' | 'onOpenChange'> & {
  items?: MenuItem[]
}

interface OpenPayload extends HostConfig {
  x: number
  y: number
  items: MenuItem[]
}

interface StoreState {
  open: boolean
  session: number
  anchor: Point
  items: ParsedMenuItem[]
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
  const parsed = parseMenuItems(items)
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

  useDismiss({
    isOpen: state.open,
    onClose: closeMenu
  })

  useEffect(
    function () {
      if (!state.open) return
      const focusable = findFocusable(state.items)
      setOpenPath([])
      setActiveKey(focusable[0]?.key)
    },
    [state.session, state.open]
  )

  function onSelect(info: MenuSelectInfo) {
    state.config.onSelect?.(info)
    closeMenu()
  }

  const layer = state.open
    ? createElement(MenuLayer, {
        key: `contextmenu-host-${state.session}`,
        layer: { anchor: state.anchor, items: state.items },
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
        onSelect,
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
      children: layer
    }),
    container
  )
}

export { closeMenu, Host, openMenu, resetMenu, useContextMenu }
export type { HostConfig, OpenPayload }
