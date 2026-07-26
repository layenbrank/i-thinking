import { clsx } from 'clsx'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react'

import {
  findFocusableItems,
  type ContextMenuClassNames,
  type ContextMenuClickInfo,
  type ContextMenuMotion,
  type ContextMenuStyles,
  type ParsedContextMenuItem
} from '@/components/contextmenu/parse-items'
import { mergeMotionSlot, PANEL_MOTION, SUBMENU_MOTION } from '@/components/contextmenu/motion'
import {
  findContainerRect,
  parsePopupOrigin,
  type Point,
  type Rect,
  ROOT_OFFSET,
  SUBMENU_OFFSET
} from '@/components/contextmenu/position'

const SUBMENU_OPEN_DELAY_MS = 100
const SUBMENU_CLOSE_DELAY_MS = 160

interface MenuPanelProps {
  items: ParsedContextMenuItem[]
  level: number
  keyPath: string[]
  openPath: string[]
  activeKey?: string
  classNames?: ContextMenuClassNames
  styles?: ContextMenuStyles
  motionConfig?: ContextMenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  submenuOpenDelay?: number
  submenuCloseDelay?: number
  container: HTMLElement
  anchor: Point | Rect
  placement: 'pointer' | 'submenu'
  preferRight?: boolean
  renderItem?: (item: ParsedContextMenuItem, node: ReactNode) => ReactNode
  renderPanel?: (
    nodes: ReactNode,
    meta: { level: number; items: ParsedContextMenuItem[] }
  ) => ReactNode
  onOpenPathChange: (path: string[]) => void
  onActiveKeyChange: (key: string | undefined) => void
  onItemClick: (info: ContextMenuClickInfo) => void
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
  const focusable = findFocusableItems(props.items)

  const motionSlot = mergeMotionSlot(
    props.level === 0 ? PANEL_MOTION : SUBMENU_MOTION,
    props.level === 0 ? props.motionConfig?.panel : props.motionConfig?.submenu,
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

      const size = {
        width: panel.offsetWidth,
        height: panel.offsetHeight
      }
      const containerRect = findContainerRect(props.container, props.boundaryPadding)

      const next = parsePopupOrigin({
        anchor: props.anchor,
        panelSize: size,
        placement: props.placement,
        offset:
          props.placement === 'submenu'
            ? (props.submenuOffset ?? SUBMENU_OFFSET)
            : (props.offset ?? ROOT_OFFSET),
        padding: props.boundaryPadding,
        containerRect,
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

  function scheduleOpen(itemKey: string) {
    clearTimers()
    openTimerRef.current = setTimeout(function () {
      props.onOpenPathChange([...props.keyPath, itemKey])
      props.onActiveKeyChange(itemKey)
    }, openDelay)
  }

  function scheduleCloseToParent() {
    clearTimers()
    closeTimerRef.current = setTimeout(function () {
      props.onOpenPathChange(props.keyPath)
    }, closeDelay)
  }

  function onPanelMouseEnter() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
  }

  function onItemMouseEnter(item: ParsedContextMenuItem) {
    props.onActiveKeyChange(item.key)
    if (item.disabled) return
    if (item.children && item.children.length > 0) {
      scheduleOpen(item.key)
    } else if (props.openPath.length > props.keyPath.length) {
      scheduleCloseToParent()
    }
  }

  function onItemClick(event: ReactMouseEvent, item: ParsedContextMenuItem) {
    event.preventDefault()
    event.stopPropagation()
    if (item.disabled) return

    if (item.children && item.children.length > 0) {
      props.onOpenPathChange([...props.keyPath, item.key])
      props.onActiveKeyChange(item.key)
      return
    }

    const info: ContextMenuClickInfo = {
      key: item.key,
      keyPath: [...props.keyPath, item.key],
      domEvent: event,
      item
    }
    item.onClick?.(info)
    props.onItemClick(info)
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (focusable.length === 0) return

    const currentIndex = focusable.findIndex(function (item) {
      return item.key === props.activeKey
    })

    if (event.key === 'Escape') {
      event.preventDefault()
      if (props.keyPath.length > 0) {
        props.onOpenPathChange(props.keyPath.slice(0, -1))
      } else {
        props.onRequestClose()
      }
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      const next = focusable[(currentIndex + 1 + focusable.length) % focusable.length]
      props.onActiveKeyChange(next.key)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      const next = focusable[(currentIndex - 1 + focusable.length) % focusable.length]
      props.onActiveKeyChange(next.key)
      return
    }

    if (event.key === 'ArrowRight') {
      const current = focusable[currentIndex]
      if (current?.children && current.children.length > 0) {
        event.preventDefault()
        props.onOpenPathChange([...props.keyPath, current.key])
        const childFocusable = findFocusableItems(current.children)
        props.onActiveKeyChange(childFocusable[0]?.key)
      }
      return
    }

    if (event.key === 'ArrowLeft') {
      if (props.keyPath.length > 0) {
        event.preventDefault()
        props.onOpenPathChange(props.keyPath.slice(0, -1))
      }
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      const current = focusable[currentIndex]
      if (!current) return
      event.preventDefault()
      if (current.children && current.children.length > 0) {
        props.onOpenPathChange([...props.keyPath, current.key])
        const childFocusable = findFocusableItems(current.children)
        props.onActiveKeyChange(childFocusable[0]?.key)
        return
      }
      const info: ContextMenuClickInfo = {
        key: current.key,
        keyPath: [...props.keyPath, current.key],
        domEvent: event.nativeEvent,
        item: current
      }
      current.onClick?.(info)
      props.onItemClick(info)
    }
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
    <MenuPanelItems
      items={props.items}
      activeKey={props.activeKey}
      openChildKey={openChildKey}
      classNames={props.classNames}
      styles={props.styles}
      onItemMouseEnter={onItemMouseEnter}
      onItemClick={onItemClick}
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
        initial={motionSlot.initial}
        animate={motionSlot.animate}
        exit={motionSlot.exit}
        transition={motionSlot.transition}
        onMouseEnter={onPanelMouseEnter}
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
            motionConfig={props.motionConfig}
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
            onItemClick={props.onItemClick}
            onRequestClose={props.onRequestClose}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

interface MenuItemRowProps {
  item: ParsedContextMenuItem
  isActive: boolean
  isSubmenuOpen: boolean
  classNames?: ContextMenuClassNames
  styles?: ContextMenuStyles
  onMouseEnter: () => void
  onClick: (event: ReactMouseEvent) => void
  renderItem?: (item: ParsedContextMenuItem, node: ReactNode) => ReactNode
}

function MenuItemRow(props: MenuItemRowProps) {
  const hasChildren = Boolean(props.item.children && props.item.children.length > 0)
  const shortcut = props.item.shortcut ?? props.item.extra

  const node = (
    <div
      role="menuitem"
      tabIndex={-1}
      data-contextmenu-key={props.item.key}
      aria-disabled={props.item.disabled || undefined}
      aria-haspopup={hasChildren || undefined}
      aria-expanded={hasChildren ? props.isSubmenuOpen : undefined}
      className={clsx(
        'contextmenu-item',
        props.classNames?.item,
        props.item.className,
        props.isActive && 'is-active',
        props.item.disabled && 'is-disabled',
        props.item.danger && 'is-danger',
        hasChildren && 'has-children'
      )}
      style={{ ...props.styles?.item, ...props.item.style }}
      onMouseEnter={props.onMouseEnter}
      onClick={props.onClick}>
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
      {hasChildren ? (
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

interface MenuPanelItemsProps {
  items: ParsedContextMenuItem[]
  activeKey?: string
  openChildKey?: string
  classNames?: ContextMenuClassNames
  styles?: ContextMenuStyles
  onItemMouseEnter: (item: ParsedContextMenuItem) => void
  onItemClick: (event: ReactMouseEvent, item: ParsedContextMenuItem) => void
  renderItem?: (item: ParsedContextMenuItem, node: ReactNode) => ReactNode
}

function MenuPanelItems(props: MenuPanelItemsProps) {
  return (
    <>
      {props.items.map(function (item) {
        if (item.type === 'divider') {
          return (
            <div
              key={item.key}
              role="separator"
              className={clsx('contextmenu-divider', props.classNames?.divider, item.className)}
              style={{ ...props.styles?.divider, ...item.style }}
            />
          )
        }
        if (item.type === 'group') {
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
                <MenuPanelItems
                  {...props}
                  items={item.children}
                />
              ) : null}
            </div>
          )
        }
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
            onClick={function (event) {
              props.onItemClick(event, item)
            }}
            renderItem={props.renderItem}
          />
        )
      })}
    </>
  )
}

export type { MenuPanelProps }
export { MenuPanel }
