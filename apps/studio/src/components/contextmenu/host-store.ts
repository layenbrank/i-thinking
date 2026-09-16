import { useCallback } from 'react'

import type { ContextMenuProps } from '@/components/contextmenu/contextmenu'
import type { MenuItem, ParsedMenuItem } from '@/components/contextmenu/menu'
import { findFocusable, parseMenuItems } from '@/components/contextmenu/menu'
import type { Point } from '@/components/contextmenu/position'

/**
 * 命令式菜单的宿主 store（`presentMenu` / `dismissMenu` / `resetMenu` / `useContextMenu`）。
 *
 * 与 `host.tsx` 的 `Host` 组件分居两个模块：组件文件只导出组件（Fast Refresh 的要求），
 * 状态与命令式 API 放这里，两边共用同一份模块级 store。
 * 只有 `Host` 需要读的东西才导出（`subscribe` / `findSnapshot`），`STORE` 本身不外泄。
 */

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
  /** 子菜单路径与高亮项：一并由 store 持有，打开新会话时直接重置，不用 effect 回灌 */
  path: string[]
  activeKey: string | undefined
}

type Listener = () => void

const LISTENERS = new Set<Listener>()

let STORE: StoreState = {
  visible: false,
  session: 0,
  anchor: { x: 0, y: 0 },
  items: [],
  config: {},
  path: [],
  activeKey: undefined
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
    config,
    path: [],
    activeKey: findFocusable(parsed)[0]?.key
  }
  emit()
}

// 值没变就不 emit：鼠标在同一条目上反复 enter 时，别把 Host 重渲染一遍
function updatePath(path: string[]) {
  if (isSamePath(STORE.path, path)) return
  STORE = { ...STORE, path }
  emit()
}

function updateActiveKey(activeKey: string | undefined) {
  if (STORE.activeKey === activeKey) return
  STORE = { ...STORE, activeKey }
  emit()
}

function isSamePath(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) return false
  }
  return true
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
    config: {},
    path: [],
    activeKey: undefined
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

export {
  dismissMenu,
  findSnapshot,
  presentMenu,
  resetMenu,
  subscribe,
  updateActiveKey,
  updatePath,
  useContextMenu
}
export type { HostConfig, PresentInput }
