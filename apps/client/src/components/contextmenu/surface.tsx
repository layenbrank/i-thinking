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

import { findFocusable, hasChildren, parseMotion } from '@/components/contextmenu/menu'
import type {
  MenuClassNames,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/menu'
import {
  findContainerRect,
  OFFSET_BY_PLACEMENT,
  parseOrigin,
  type Point,
  type Rect
} from '@/components/contextmenu/position'

const EXPAND_DELAY_MS = 100
const COLLAPSE_DELAY_MS = 160

interface SurfaceProps {
  items: ParsedMenuItem[]
  level: number
  keyPath: string[]
  path: string[]
  activeKey?: string
  classNames?: MenuClassNames
  styles?: MenuStyles
  motion?: MenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  expandDelay?: number
  collapseDelay?: number
  container: HTMLElement
  anchor: Point | Rect
  placement: 'pointer' | 'submenu'
  preferRight?: boolean
  /** 自定义面板内容；有值时替代菜单项列表 */
  content?: ReactNode
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
  renderSurface?: (
    nodes: ReactNode,
    meta: { level: number; items: ParsedMenuItem[] }
  ) => ReactNode
  onpathChange: (path: string[]) => void
  onUpdateActive: (key: string | undefined) => void
  onSelect: (info: MenuSelectInfo) => void
  onClose: () => void
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

function Surface(props: SurfaceProps) {
  const isReduced = useReducedMotion()
  const surfaceRef = useRef<HTMLDivElement>(null)
  const [origin, setOrigin] = useState({ left: -9999, top: -9999, flipX: false, flipY: false })
  const [isMeasured, setMeasured] = useState(false)
  const [childAnchor, setChildAnchor] = useState<Rect | null>(null)
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const expandDelayMs = props.expandDelay ?? EXPAND_DELAY_MS
  const collapseDelayMs = props.collapseDelay ?? COLLAPSE_DELAY_MS
  const focusable = findFocusable(props.items)

  const motion = parseMotion(
    props.level,
    props.level === 0 ? props.motion?.surface : props.motion?.submenu,
    Boolean(isReduced)
  )

  function clearTimers() {
    if (expandTimerRef.current) {
      clearTimeout(expandTimerRef.current)
      expandTimerRef.current = null
    }
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  useLayoutEffect(
    function () {
      const el = surfaceRef.current
      if (!el) return

      const next = parseOrigin({
        anchor: props.anchor,
        size: { width: el.offsetWidth, height: el.offsetHeight },
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

  const expandedKey = props.path[props.keyPath.length]
  const expanded = expandedKey
    ? props.items.find(function (item) {
        return item.key === expandedKey
      })
    : undefined

  useLayoutEffect(
    function () {
      if (!expanded || !surfaceRef.current) {
        setChildAnchor(null)
        return
      }
      const row = surfaceRef.current.querySelector<HTMLElement>(
        `[data-contextmenu-key="${CSS.escape(expanded.key)}"]`
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
    [expanded, props.path, origin.left, origin.top, isMeasured]
  )

  useEffect(function () {
    return function () {
      clearTimers()
    }
  }, [])

  function expand(itemKey: string) {
    clearTimers()
    expandTimerRef.current = setTimeout(function () {
      props.onpathChange([...props.keyPath, itemKey])
      props.onUpdateActive(itemKey)
    }, expandDelayMs)
  }

  function collapse() {
    clearTimers()
    collapseTimerRef.current = setTimeout(function () {
      props.onpathChange(props.keyPath)
    }, collapseDelayMs)
  }

  function cancelPendingClose() {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
      collapseTimerRef.current = null
    }
  }

  function onItemMouseEnter(item: ParsedMenuItem) {
    props.onUpdateActive(item.key)
    if (item.disabled) return
    if (hasChildren(item)) {
      expand(item.key)
      return
    }
    if (props.path.length > props.keyPath.length) collapse()
  }

  function selectItem(
    item: ParsedMenuItem,
    event: ReactPointerEvent | ReactKeyboardEvent | KeyboardEvent
  ) {
    if (item.disabled) return

    if (hasChildren(item)) {
      props.onpathChange([...props.keyPath, item.key])
      props.onUpdateActive(item.key)
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
        props.onpathChange(props.keyPath.slice(0, -1))
        return
      }
      props.onClose()
    },
    ArrowDown: function (event, currentIndex) {
      event.preventDefault()
      const next = focusable[(currentIndex + 1 + focusable.length) % focusable.length]
      props.onUpdateActive(next.key)
    },
    ArrowUp: function (event, currentIndex) {
      event.preventDefault()
      const next = focusable[(currentIndex - 1 + focusable.length) % focusable.length]
      props.onUpdateActive(next.key)
    },
    ArrowRight: function (event, currentIndex) {
      const current = focusable[currentIndex]
      if (!current || !hasChildren(current)) return
      event.preventDefault()
      props.onpathChange([...props.keyPath, current.key])
      if (current.content != null) {
        props.onUpdateActive(current.key)
        return
      }
      const nested = findFocusable(current.children ?? [])
      props.onUpdateActive(nested[0]?.key)
    },
    ArrowLeft: function (event) {
      if (props.keyPath.length === 0) return
      event.preventDefault()
      props.onpathChange(props.keyPath.slice(0, -1))
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

  const surfaceStyle: CSSProperties = {
    ...props.styles?.surface,
    ...(props.level > 0 ? props.styles?.submenu : null),
    left: origin.left,
    top: origin.top,
    visibility: isMeasured ? 'visible' : 'hidden',
    pointerEvents: isMeasured ? 'auto' : 'none'
  }

  const itemsNode =
    props.content != null ? (
      props.content
    ) : (
      <MenuItems
        items={props.items}
        activeKey={props.activeKey}
        expandedKey={expandedKey}
        classNames={props.classNames}
        styles={props.styles}
        onItemMouseEnter={onItemMouseEnter}
        onItemPointerDown={onItemPointerDown}
        renderItem={props.renderItem}
      />
    )

  const surfaceContent = props.renderSurface
    ? props.renderSurface(itemsNode, { level: props.level, items: props.items })
    : itemsNode

  return (
    <>
      <Motion.div
        ref={surfaceRef}
        className={clsx(
          'contextmenu-surface',
          props.level === 0 && 'is-root',
          props.classNames?.surface,
          props.level > 0 && props.classNames?.submenu
        )}
        style={surfaceStyle}
        role="menu"
        tabIndex={-1}
        data-region="false"
        initial={motion.initial}
        animate={motion.animate}
        exit={motion.exit}
        transition={motion.transition}
        onMouseEnter={cancelPendingClose}
        onKeyDown={onKeyDown}
        data-flip-x={origin.flipX ? 'true' : 'false'}
        data-flip-y={origin.flipY ? 'true' : 'false'}>
        {surfaceContent}
      </Motion.div>

      <AnimatePresence>
        {expanded && childAnchor && (expanded.content != null || expanded.children) ? (
          <Surface
            key={expanded.key}
            items={expanded.children ?? []}
            content={expanded.content}
            level={props.level + 1}
            keyPath={[...props.keyPath, expanded.key]}
            path={props.path}
            activeKey={props.activeKey}
            classNames={props.classNames}
            styles={props.styles}
            motion={props.motion}
            offset={props.offset}
            submenuOffset={props.submenuOffset}
            boundaryPadding={props.boundaryPadding}
            expandDelay={props.expandDelay}
            collapseDelay={props.collapseDelay}
            container={props.container}
            anchor={childAnchor}
            placement="submenu"
            preferRight={!origin.flipX}
            renderItem={props.renderItem}
            renderSurface={props.renderSurface}
            onpathChange={props.onpathChange}
            onUpdateActive={props.onUpdateActive}
            onSelect={props.onSelect}
            onClose={props.onClose}
          />
        ) : null}
      </AnimatePresence>
    </>
  )
}

interface MenuItemRowProps {
  item: ParsedMenuItem
  isActive: boolean
  isExpanded: boolean
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
      aria-expanded={isSubmenu ? props.isExpanded : undefined}
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
  expandedKey?: string
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
        className={clsx('contextmenu-group', item.className)}
        style={item.style}
        role="group">
        {item.label ? <div className="contextmenu-group-title">{item.label}</div> : null}
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
        isExpanded={props.expandedKey === item.key}
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

export type { SurfaceProps }
export { Surface }
