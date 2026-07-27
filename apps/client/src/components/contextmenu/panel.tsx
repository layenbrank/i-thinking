import { clsx } from 'clsx'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode
} from 'react'

import { findFocusable, hasChildren } from '@/components/contextmenu/parse'
import { mergeMotionSlot, PANEL_MOTION, SUBMENU_MOTION } from '@/components/contextmenu/motion'
import {
  findContainerRect,
  OFFSET_BY_PLACEMENT,
  parseOrigin,
  type Point,
  type Rect
} from '@/components/contextmenu/position'
import type {
  MenuClassNames,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/types'

const SUBMENU_OPEN_DELAY_MS = 100
const SUBMENU_CLOSE_DELAY_MS = 160

interface MenuPanelProps {
  items: ParsedMenuItem[]
  level: number
  keyPath: string[]
  openPath: string[]
  activeKey?: string
  classNames?: MenuClassNames
  styles?: MenuStyles
  motion?: MenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  submenuOpenDelay?: number
  submenuCloseDelay?: number
  container: HTMLElement
  anchor: Point | Rect
  placement: 'pointer' | 'submenu'
  preferRight?: boolean
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
  renderPanel?: (
    nodes: ReactNode,
    meta: { level: number; items: ParsedMenuItem[] }
  ) => ReactNode
  onOpenPathChange: (path: string[]) => void
  onActiveKeyChange: (key: string | undefined) => void
  onSelect: (info: MenuSelectInfo) => void
  onRequestClose: () => void
}

function RightArrow() {
  return (
    <svg
      className="contextmenu-arrow-icon"
      viewBox="0 0 12 12"
      width="10"
      height="10"
      aria-hidden="true"
      focusable="false">
      <path
        d="M4.2 1.5L8.7 6L4.2 10.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function MenuPanel(props: MenuPanelProps) {
  const isReduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState({ left: -9999, top: -9999, flipX: false, flipY: false })
  const [isMeasured, setMeasured] = useState(false)
  const [childAnchor, setChildAnchor] = useState<Rect | null>(null)
  const openTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const openDelay = props.submenuOpenDelay ?? SUBMENU_OPEN_DELAY_MS
  const closeDelay = props.submenuCloseDelay ?? SUBMENU_CLOSE_DELAY_MS
  const focusable = findFocusable(props.items)

  const motionSlot = mergeMotionSlot(
    props.level === 0 ? PANEL_MOTION : SUBMENU_MOTION,
    props.level === 0 ? props.motion?.panel : props.motion?.submenu,
    Boolean(isReduced)
  )

  function clearTimers() {
    if (openTimerRef.current) {
      clearTimeout(openTimerRef.current)
      openTimerRef.current = null
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  useLayoutEffect(
    function () {
      const panel = panelRef.current
      if (!panel) return

      const next = parseOrigin({
        anchor: props.anchor,
        panelSize: { width: panel.offsetWidth, height: panel.offsetHeight },
        placement: props.placement,
        offset:
          props.placement === 'submenu'
            ? (props.submenuOffset ?? OFFSET_BY_PLACEMENT.submenu)
            : (props.offset ?? OFFSET_BY_PLACEMENT.pointer),
        padding: props.boundaryPadding,
        containerRect: findContainerRect(props.container, props.boundaryPadding),
        preferRight: props.preferRight
      })

      setOrigin(next)
      setMeasured(true)
    },
    [
      props.anchor,
      props.boundaryPadding,
      props.container,
      props.offset,
      props.placement,
      props.preferRight,
      props.submenuOffset,
      props.items
    ]
  )

  const openChildKey = props.openPath[props.keyPath.length]
  const openChild = openChildKey
    ? props.items.find(function (item) {
        return item.key === openChildKey
      })
    : undefined

  useLayoutEffect(
    function () {
      if (!openChild || !panelRef.current) {
        setChildAnchor(null)
        return
      }
      const row = panelRef.current.querySelector<HTMLElement>(
        `[data-contextmenu-key="${CSS.escape(openChild.key)}"]`
      )
      if (!row) {
        setChildAnchor(null)
        return
      }
      const box = row.getBoundingClientRect()
      setChildAnchor({
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        right: box.right,
        bottom: box.bottom
      })
    },
    [openChild, props.openPath, origin.left, origin.top, isMeasured]
  )

  useEffect(function () {
    return function () {
      clearTimers()
    }
  }, [])

  function openSubmenu(itemKey: string) {
    clearTimers()
    openTimerRef.current = setTimeout(function () {
      props.onOpenPathChange([...props.keyPath, itemKey])
      props.onActiveKeyChange(itemKey)
    }, openDelay)
  }

  function closeSubmenu() {
    clearTimers()
    closeTimerRef.current = setTimeout(function () {
      props.onOpenPathChange(props.keyPath)
    }, closeDelay)
  }

  function cancelPendingClose() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function onItemMouseEnter(item: ParsedMenuItem) {
    props.onActiveKeyChange(item.key)
    if (item.disabled) return
    if (hasChildren(item)) {
      openSubmenu(item.key)
      return
    }
    if (props.openPath.length > props.keyPath.length) closeSubmenu()
  }

  function selectItem(
    item: ParsedMenuItem,
    event: ReactPointerEvent | ReactKeyboardEvent | KeyboardEvent
  ) {
    if (item.disabled) return

    if (hasChildren(item)) {
      props.onOpenPathChange([...props.keyPath, item.key])
      props.onActiveKeyChange(item.key)
      return
    }

    const info: MenuSelectInfo = {
      key: item.key,
      keyPath: [...props.keyPath, item.key],
      event,
      item
    }
    item.onSelect?.(info)
    props.onSelect(info)
  }

  function onItemPointerDown(event: ReactPointerEvent, item: ParsedMenuItem) {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    selectItem(item, event)
  }

  const KEYBOARD_ACTIONS: Record<
    string,
    (event: ReactKeyboardEvent<HTMLDivElement>, currentIndex: number) => void
  > = {
    Escape: function (event) {
      event.preventDefault()
      if (props.keyPath.length > 0) {
        props.onOpenPathChange(props.keyPath.slice(0, -1))
        return
      }
      props.onRequestClose()
    },
    ArrowDown: function (event, currentIndex) {
      event.preventDefault()
      const next = focusable[(currentIndex + 1 + focusable.length) % focusable.length]
      props.onActiveKeyChange(next.key)
    },
    ArrowUp: function (event, currentIndex) {
      event.preventDefault()
      const next = focusable[(currentIndex - 1 + focusable.length) % focusable.length]
      props.onActiveKeyChange(next.key)
    },
    ArrowRight: function (event, currentIndex) {
      const current = focusable[currentIndex]
      if (!current || !hasChildren(current)) return
      event.preventDefault()
      props.onOpenPathChange([...props.keyPath, current.key])
      props.onActiveKeyChange(findFocusable(current.children!)[0]?.key)
    },
    ArrowLeft: function (event) {
      if (props.keyPath.length === 0) return
      event.preventDefault()
      props.onOpenPathChange(props.keyPath.slice(0, -1))
    },
    Enter: function (event, currentIndex) {
      const current = focusable[currentIndex]
      if (!current) return
      event.preventDefault()
      selectItem(current, event)
    },
    ' ': function (event, currentIndex) {
      const current = focusable[currentIndex]
      if (!current) return
      event.preventDefault()
      selectItem(current, event)
    }
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (focusable.length === 0) return
    const action = KEYBOARD_ACTIONS[event.key]
    if (!action) return
    const currentIndex = focusable.findIndex(function (item) {
      return item.key === props.activeKey
    })
    action(event, currentIndex)
  }

  const panelStyle: CSSProperties = {
    ...props.styles?.panel,
    ...(props.level > 0 ? props.styles?.submenu : null),
    left: origin.left,
    top: origin.top,
    visibility: isMeasured ? 'visible' : 'hidden',
    pointerEvents: isMeasured ? 'auto' : 'none'
  }

  const itemsNode = (
    <MenuItems
      items={props.items}
      activeKey={props.activeKey}
      openChildKey={openChildKey}
      classNames={props.classNames}
      styles={props.styles}
      onItemMouseEnter={onItemMouseEnter}
      onItemPointerDown={onItemPointerDown}
      renderItem={props.renderItem}
    />
  )

  const panelContent = props.renderPanel
    ? props.renderPanel(itemsNode, { level: props.level, items: props.items })
    : itemsNode

  return (
    <>
      <Motion.div
        ref={panelRef}
        className={clsx(
          'contextmenu-panel',
          props.level === 0 && 'is-root',
          props.classNames?.panel,
          props.level > 0 && props.classNames?.submenu
        )}
        style={panelStyle}
        role="menu"
        tabIndex={-1}
        data-region="false"
        initial={motionSlot.initial}
        animate={motionSlot.animate}
        exit={motionSlot.exit}
        transition={motionSlot.transition}
        onMouseEnter={cancelPendingClose}
        onKeyDown={onKeyDown}
        data-flip-x={origin.flipX ? 'true' : 'false'}
        data-flip-y={origin.flipY ? 'true' : 'false'}>
        {panelContent}
      </Motion.div>

      <AnimatePresence>
        {openChild && openChild.children && childAnchor ? (
          <MenuPanel
            key={openChild.key}
            items={openChild.children}
            level={props.level + 1}
            keyPath={[...props.keyPath, openChild.key]}
            openPath={props.openPath}
            activeKey={props.activeKey}
            classNames={props.classNames}
            styles={props.styles}
            motion={props.motion}
            offset={props.offset}
            submenuOffset={props.submenuOffset}
            boundaryPadding={props.boundaryPadding}
            submenuOpenDelay={props.submenuOpenDelay}
            submenuCloseDelay={props.submenuCloseDelay}
            container={props.container}
            anchor={childAnchor}
            placement="submenu"
            preferRight={!origin.flipX}
            renderItem={props.renderItem}
            renderPanel={props.renderPanel}
            onOpenPathChange={props.onOpenPathChange}
            onActiveKeyChange={props.onActiveKeyChange}
            onSelect={props.onSelect}
            onRequestClose={props.onRequestClose}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

interface MenuItemRowProps {
  item: ParsedMenuItem
  isActive: boolean
  isSubmenuOpen: boolean
  classNames?: MenuClassNames
  styles?: MenuStyles
  onMouseEnter: () => void
  onPointerDown: (event: ReactPointerEvent) => void
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
}

function MenuItemRow(props: MenuItemRowProps) {
  const isSubmenu = hasChildren(props.item)
  const shortcut = props.item.shortcut

  const node = (
    <div
      role="menuitem"
      tabIndex={-1}
      data-contextmenu-key={props.item.key}
      aria-disabled={props.item.disabled || undefined}
      aria-haspopup={isSubmenu || undefined}
      aria-expanded={isSubmenu ? props.isSubmenuOpen : undefined}
      className={clsx(
        'contextmenu-item',
        props.classNames?.item,
        props.item.className,
        props.isActive && 'is-active',
        props.item.disabled && 'is-disabled',
        props.item.danger && 'is-danger',
        isSubmenu && 'has-children'
      )}
      style={{ ...props.styles?.item, ...props.item.style }}
      onMouseEnter={props.onMouseEnter}
      onPointerDown={props.onPointerDown}>
      {props.item.icon ? (
        <span
          className={clsx('contextmenu-icon', props.classNames?.icon)}
          style={props.styles?.icon}>
          {props.item.icon}
        </span>
      ) : (
        <span className="contextmenu-icon contextmenu-icon-empty" />
      )}
      <span
        className={clsx('contextmenu-label', props.classNames?.label)}
        style={props.styles?.label}>
        {props.item.label}
      </span>
      {shortcut ? (
        <span
          className={clsx('contextmenu-shortcut', props.classNames?.shortcut)}
          style={props.styles?.shortcut}>
          {shortcut}
        </span>
      ) : null}
      {isSubmenu ? (
        <span
          className={clsx('contextmenu-arrow', props.classNames?.arrow)}
          style={props.styles?.arrow}>
          <RightArrow />
        </span>
      ) : (
        <span className="contextmenu-arrow contextmenu-arrow-empty" />
      )}
    </div>
  )

  return props.renderItem ? props.renderItem(props.item, node) : node
}

interface MenuItemsProps {
  items: ParsedMenuItem[]
  activeKey?: string
  openChildKey?: string
  classNames?: MenuClassNames
  styles?: MenuStyles
  onItemMouseEnter: (item: ParsedMenuItem) => void
  onItemPointerDown: (event: ReactPointerEvent, item: ParsedMenuItem) => void
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
}

type ItemRenderer = (props: MenuItemsProps, item: ParsedMenuItem) => ReactNode

const ITEM_RENDERERS: Record<string, ItemRenderer> = {
  divider: function (_props, item) {
    return (
      <div
        key={item.key}
        role="separator"
        className={clsx('contextmenu-divider', _props.classNames?.divider, item.className)}
        style={{ ..._props.styles?.divider, ...item.style }}
      />
    )
  },
  group: function (props, item) {
    return (
      <div
        key={item.key}
        className={clsx('contextmenu-group', props.classNames?.group, item.className)}
        style={{ ...props.styles?.group, ...item.style }}
        role="group">
        {item.label ? (
          <div
            className={clsx('contextmenu-group-title', props.classNames?.groupTitle)}
            style={props.styles?.groupTitle}>
            {item.label}
          </div>
        ) : null}
        {item.children ? (
          <MenuItems
            {...props}
            items={item.children}
          />
        ) : null}
      </div>
    )
  },
  item: function (props, item) {
    return (
      <MenuItemRow
        key={item.key}
        item={item}
        isActive={props.activeKey === item.key}
        isSubmenuOpen={props.openChildKey === item.key}
        classNames={props.classNames}
        styles={props.styles}
        onMouseEnter={function () {
          props.onItemMouseEnter(item)
        }}
        onPointerDown={function (event) {
          props.onItemPointerDown(event, item)
        }}
        renderItem={props.renderItem}
      />
    )
  }
}

function MenuItems(props: MenuItemsProps) {
  return (
    <>
      {props.items.map(function (item) {
        const render = ITEM_RENDERERS[item.type] ?? ITEM_RENDERERS.item
        return render(props, item)
      })}
    </>
  )
}

export type { MenuPanelProps }
export { MenuPanel }
