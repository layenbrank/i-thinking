import { clsx } from 'clsx'
import { AnimatePresence, motion as Motion, useReducedMotion } from 'motion/react'
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react'
import { createPortal } from 'react-dom'

import { MenuPanel } from '@/components/contextmenu/panel'
import {
  findFocusableItems,
  parseItems,
  type ContextMenuClassNames,
  type ContextMenuClickInfo,
  type ContextMenuItem,
  type ContextMenuMotion,
  type ContextMenuStyles,
  type ParsedContextMenuItem
} from '@/components/contextmenu/parse-items'
import { mergeMotionSlot, PANEL_MOTION } from '@/components/contextmenu/motion'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'

import '@/components/contextmenu/contextmenu.scss'

interface ContextMenuProps {
  items: ContextMenuItem[]
  children?: ReactNode
  disabled?: boolean
  open?: boolean
  className?: string
  classNames?: ContextMenuClassNames
  styles?: ContextMenuStyles
  motion?: ContextMenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  submenuOpenDelay?: number
  submenuCloseDelay?: number
  findPopupContainer?: () => HTMLElement
  renderItem?: (item: ParsedContextMenuItem, node: ReactNode) => ReactNode
  renderPanel?: (
    nodes: ReactNode,
    meta: { level: number; items: ParsedContextMenuItem[] }
  ) => ReactNode
  onOpenChange?: (open: boolean) => void
  onClick?: (info: ContextMenuClickInfo) => void
}

interface OverlayState {
  anchor: Point
  items: ParsedContextMenuItem[]
}

interface TriggerElementProps {
  className?: string
  onContextMenu?: (event: ReactMouseEvent) => void
  ref?: Ref<HTMLElement>
}

interface ContextMenuOverlayProps {
  overlay: OverlayState
  openPath: string[]
  activeKey?: string
  classNames?: ContextMenuClassNames
  styles?: ContextMenuStyles
  motion?: ContextMenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  submenuOpenDelay?: number
  submenuCloseDelay?: number
  container: HTMLElement
  renderItem?: ContextMenuProps['renderItem']
  renderPanel?: ContextMenuProps['renderPanel']
  onOpenPathChange: (path: string[]) => void
  onActiveKeyChange: (key: string | undefined) => void
  onItemClick: (info: ContextMenuClickInfo) => void
  onRequestClose: () => void
}

function findDefaultContainer() {
  return document.body
}

function assignRef(ref: Ref<HTMLElement> | undefined, node: HTMLElement | null) {
  if (typeof ref === 'function') {
    ref(node)
    return
  }
  if (ref && typeof ref === 'object') {
    ;(ref as { current: HTMLElement | null }).current = node
  }
}

function ContextMenuOverlay(props: ContextMenuOverlayProps) {
  const isReduced = useReducedMotion()
  const shellMotion = mergeMotionSlot(PANEL_MOTION, props.motion?.panel, Boolean(isReduced))

  return (
    <Motion.div
      className={clsx('contextmenu-root')}
      initial={shellMotion.initial}
      animate={shellMotion.animate}
      exit={shellMotion.exit}
      transition={shellMotion.transition}>
      <MenuPanel
        items={props.overlay.items}
        level={0}
        keyPath={[]}
        openPath={props.openPath}
        activeKey={props.activeKey}
        classNames={props.classNames}
        styles={props.styles}
        motionConfig={{
          ...props.motion,
          // 根壳已做进退场，内层根面板不再重复 motion
          panel: {
            initial: { opacity: 1, scale: 1, y: 0 },
            animate: { opacity: 1, scale: 1, y: 0 },
            exit: { opacity: 1, scale: 1, y: 0 },
            transition: { duration: 0 }
          }
        }}
        offset={props.offset}
        submenuOffset={props.submenuOffset}
        boundaryPadding={props.boundaryPadding ?? VIEWPORT_PADDING}
        submenuOpenDelay={props.submenuOpenDelay}
        submenuCloseDelay={props.submenuCloseDelay}
        container={props.container}
        anchor={props.overlay.anchor}
        placement="pointer"
        renderItem={props.renderItem}
        renderPanel={props.renderPanel}
        onOpenPathChange={props.onOpenPathChange}
        onActiveKeyChange={props.onActiveKeyChange}
        onItemClick={props.onItemClick}
        onRequestClose={props.onRequestClose}
      />
    </Motion.div>
  )
}

function Provider(props: ContextMenuProps) {
  const isControlled = props.open !== undefined
  const [innerOpen, setInnerOpen] = useState(false)
  const [overlay, setOverlay] = useState<OverlayState | null>(null)
  const [openPath, setOpenPath] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>()
  const rootRef = useRef<HTMLElement | null>(null)

  const isOpen = isControlled ? Boolean(props.open) : innerOpen

  function updateOpen(next: boolean) {
    if (!isControlled) setInnerOpen(next)
    props.onOpenChange?.(next)
    if (!next) {
      setOpenPath([])
      setActiveKey(undefined)
      // overlay 延迟到 AnimatePresence 退场后再清，避免动画中内容丢失
    }
  }

  function clearOverlay() {
    setOverlay(null)
    setOpenPath([])
    setActiveKey(undefined)
  }

  function openAt(point: Point, items: ContextMenuItem[]) {
    if (props.disabled) return
    const parsed = parseItems(items)
    const focusable = findFocusableItems(parsed)
    setOverlay({ anchor: point, items: parsed })
    setOpenPath([])
    setActiveKey(focusable[0]?.key)
    if (!isControlled) setInnerOpen(true)
    props.onOpenChange?.(true)
  }

  function onContextMenu(event: ReactMouseEvent) {
    if (props.disabled) return
    event.preventDefault()
    event.stopPropagation()
    openAt({ x: event.clientX, y: event.clientY }, props.items)
  }

  function onItemClick(info: ContextMenuClickInfo) {
    props.onClick?.(info)
    updateOpen(false)
  }

  useEffect(
    function () {
      if (!isOpen) return

      function onPointerDown(event: MouseEvent) {
        const target = event.target as Node | null
        if (!target) return
        const panels = document.querySelectorAll('.contextmenu-panel')
        for (const panel of panels) {
          if (panel.contains(target)) return
        }
        if (rootRef.current?.contains(target)) return
        updateOpen(false)
      }

      function onKeyDown(event: KeyboardEvent) {
        if (event.key === 'Escape') updateOpen(false)
      }

      function onResize() {
        updateOpen(false)
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
    [isOpen]
  )

  useEffect(
    function () {
      if (isControlled && props.open && !overlay) {
        const el = rootRef.current
        if (!el) return
        const box = el.getBoundingClientRect()
        openAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, props.items)
      }
    },
    [isControlled, props.open]
  )

  const child = props.children
  let trigger: ReactNode = child

  if (child === undefined || child === null) {
    trigger = null
  } else if (isValidElement(child)) {
    const element = child as ReactElement<TriggerElementProps>
    trigger = cloneElement(element, {
      className: clsx(element.props.className, props.className, props.classNames?.root),
      onContextMenu: function (event: ReactMouseEvent) {
        element.props.onContextMenu?.(event)
        onContextMenu(event)
      },
      ref: function (node: HTMLElement | null) {
        rootRef.current = node
        assignRef(element.props.ref, node)
      }
    })
  } else {
    trigger = (
      <div
        ref={function (node) {
          rootRef.current = node
        }}
        className={clsx('contextmenu-trigger', props.className, props.classNames?.root)}
        style={props.styles?.root}
        onContextMenu={onContextMenu}>
        {child}
      </div>
    )
  }

  const container = (props.findPopupContainer ?? findDefaultContainer)()

  return (
    <>
      {trigger}
      {createPortal(
        <AnimatePresence onExitComplete={clearOverlay}>
          {isOpen && overlay ? (
            <ContextMenuOverlay
              key="contextmenu-overlay"
              overlay={overlay}
              openPath={openPath}
              activeKey={activeKey}
              classNames={props.classNames}
              styles={props.styles}
              motion={props.motion}
              offset={props.offset}
              submenuOffset={props.submenuOffset}
              boundaryPadding={props.boundaryPadding}
              submenuOpenDelay={props.submenuOpenDelay}
              submenuCloseDelay={props.submenuCloseDelay}
              container={container}
              renderItem={props.renderItem}
              renderPanel={props.renderPanel}
              onOpenPathChange={setOpenPath}
              onActiveKeyChange={setActiveKey}
              onItemClick={onItemClick}
              onRequestClose={function () {
                updateOpen(false)
              }}
            />
          ) : null}
        </AnimatePresence>,
        container
      )}
    </>
  )
}

export type { ContextMenuProps, OverlayState, ContextMenuOverlayProps }
export { Provider, findDefaultContainer, ContextMenuOverlay }
