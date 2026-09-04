import { AnimatePresence } from 'motion/react'
import { createElement, useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

import {
  findBody,
  MenuLayer,
  type ContextMenuProps
} from '@/components/contextmenu/contextmenu'
import { findFocusable, parseMenuItems, useDismiss } from '@/components/contextmenu/menu'
import type { MenuItem, MenuSelectInfo, ParsedMenuItem } from '@/components/contextmenu/menu'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'

type HostConfig = Omit<ContextMenuProps, 'children' | 'items' | 'visible' | 'onUpdateVisible'> & {
  items?: MenuItem[]
}

/** 命令式打开菜单的入参 */
interface PresentInput extends HostConfig {
  x: number
  y: number
  items: MenuItem[]
}

interface StoreState {
  visible: boolean
  session: number
  anchor: Point
  items: ParsedMenuItem[]
  config: HostConfig
}

type Listener = () => void

const LISTENERS = new Set<Listener>()

let STORE: StoreState = {
  visible: false,
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

function presentMenu(input: PresentInput) {
  const { x, y, items, ...config } = input
  const parsed = parseMenuItems(items)
  STORE = {
    visible: true,
    session: STORE.session + 1,
    anchor: { x, y },
    items: parsed,
    config
  }
  emit()
}

function dismissMenu() {
  if (!STORE.visible) return
  STORE = {
    ...STORE,
    visible: false
  }
  emit()
}

function resetMenu() {
  STORE = {
    visible: false,
    session: STORE.session,
    anchor: { x: 0, y: 0 },
    items: [],
    config: {}
  }
  emit()
}

function useContextMenu() {
  const present = useCallback(function (input: PresentInput) {
    presentMenu(input)
  }, [])

  const dismiss = useCallback(function () {
    dismissMenu()
  }, [])

  return { present, dismiss }
}

function Host() {
  const state = useSyncExternalStore(subscribe, findSnapshot, findSnapshot)
  const [path, setPath] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>()

  const container = (state.config.onTeleport ?? findBody)()

  useDismiss({
    visible: state.visible,
    onClose: dismissMenu
  })

  useEffect(
    function () {
      if (!state.visible) return
      const focusable = findFocusable(state.items)
      setPath([])
      setActiveKey(focusable[0]?.key)
    },
    [state.session, state.visible]
  )

  function onSelect(info: MenuSelectInfo) {
    state.config.onSelect?.(info)
    dismissMenu()
  }

  // session 进 key：已打开再开时重播入场；onExitComplete 仅在关闭后 reset
  const layer = state.visible
    ? createElement(MenuLayer, {
        key: `contextmenu-host-${state.session}`,
        layer: { anchor: state.anchor, items: state.items },
        path,
        activeKey,
        classNames: state.config.classNames,
        styles: state.config.styles,
        motion: state.config.motion,
        offset: state.config.offset,
        submenuOffset: state.config.submenuOffset,
        boundaryPadding: state.config.boundaryPadding ?? VIEWPORT_PADDING,
        expandDelay: state.config.expandDelay,
        collapseDelay: state.config.collapseDelay,
        container,
        renderItem: state.config.renderItem,
        renderSurface: state.config.renderSurface,
        onUpdatePath: setPath,
        onUpdateActive: setActiveKey,
        onSelect,
        onClose: dismissMenu
      })
    : null

  return createPortal(
    createElement(AnimatePresence, {
      onExitComplete: function () {
        if (STORE.visible) return
        setPath([])
        setActiveKey(undefined)
        resetMenu()
      },
      children: layer
    }),
    container
  )
}

export { dismissMenu, Host, presentMenu, resetMenu, useContextMenu }
export type { HostConfig, PresentInput }
