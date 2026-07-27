import { clsx } from 'clsx'
import { AnimatePresence, motion as Motion } from 'motion/react'
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

import { useDismiss } from '@/components/contextmenu/dismiss'
import { MenuPanel } from '@/components/contextmenu/panel'
import { findFocusable, parseMenuItems } from '@/components/contextmenu/parse'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'
import type {
  MenuClassNames,
  MenuItem,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/types'
import { CSSVAR } from '@/themes'

import '@/components/contextmenu/contextmenu.scss'

const SHELL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 }
}

interface ContextMenuProps {
  items: MenuItem[]
  children?: ReactNode
  disabled?: boolean
  open?: boolean
  className?: string
  classNames?: MenuClassNames
  styles?: MenuStyles
  motion?: MenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  submenuOpenDelay?: number
  submenuCloseDelay?: number
  findPopupContainer?: () => HTMLElement
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
  renderPanel?: (
    nodes: ReactNode,
    meta: { level: number; items: ParsedMenuItem[] }
  ) => ReactNode
  onOpenChange?: (open: boolean) => void
  onSelect?: (info: MenuSelectInfo) => void
}

interface LayerState {
  anchor: Point
  items: ParsedMenuItem[]
}

interface TriggerElementProps {
  className?: string
  onContextMenu?: (event: ReactMouseEvent) => void
  ref?: Ref<HTMLElement>
}

interface MenuLayerProps {
  layer: LayerState
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
  renderItem?: ContextMenuProps['renderItem']
  renderPanel?: ContextMenuProps['renderPanel']
  onOpenPathChange: (path: string[]) => void
  onActiveKeyChange: (key: string | undefined) => void
  onSelect: (info: MenuSelectInfo) => void
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

function MenuLayer(props: MenuLayerProps) {
  // 壳层仅 opacity，禁止 transform/filter，避免 fixed 面板包含块被改写
  return (
    <Motion.div
      className={clsx('contextmenu-root', CSSVAR.KEY)}
      initial={SHELL_MOTION.initial}
      animate={SHELL_MOTION.animate}
      exit={SHELL_MOTION.exit}
      transition={SHELL_MOTION.transition}>
      <MenuPanel
        items={props.layer.items}
        level={0}
        keyPath={[]}
        openPath={props.openPath}
        activeKey={props.activeKey}
        classNames={props.classNames}
        styles={props.styles}
        motion={props.motion}
        offset={props.offset}
        submenuOffset={props.submenuOffset}
        boundaryPadding={props.boundaryPadding ?? VIEWPORT_PADDING}
        submenuOpenDelay={props.submenuOpenDelay}
        submenuCloseDelay={props.submenuCloseDelay}
        container={props.container}
        anchor={props.layer.anchor}
        placement="pointer"
        renderItem={props.renderItem}
        renderPanel={props.renderPanel}
        onOpenPathChange={props.onOpenPathChange}
        onActiveKeyChange={props.onActiveKeyChange}
        onSelect={props.onSelect}
        onRequestClose={props.onRequestClose}
      />
    </Motion.div>
  )
}

function Root(props: ContextMenuProps) {
  const isControlled = props.open !== undefined
  const [innerOpen, setInnerOpen] = useState(false)
  const [layer, setLayer] = useState<LayerState | null>(null)
  const [openPath, setOpenPath] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>()
  const triggerRef = useRef<HTMLElement | null>(null)

  const isOpen = isControlled ? Boolean(props.open) : innerOpen

  function updateOpen(next: boolean) {
    if (!isControlled) setInnerOpen(next)
    props.onOpenChange?.(next)
    if (!next) {
      setOpenPath([])
      setActiveKey(undefined)
    }
  }

  function clearLayer() {
    setLayer(null)
    setOpenPath([])
    setActiveKey(undefined)
  }

  function openAt(point: Point, items: MenuItem[]) {
    if (props.disabled) return
    const parsed = parseMenuItems(items)
    const focusable = findFocusable(parsed)
    setLayer({ anchor: point, items: parsed })
    setOpenPath([])
    setActiveKey(focusable[0]?.key)
    if (!isControlled) setInnerOpen(true)
    props.onOpenChange?.(true)
  }

  function onContextMenu(event: ReactMouseEvent) {
    if (props.disabled) return
    if (!props.items.length) return
    if (event.shiftKey) return
    event.preventDefault()
    event.stopPropagation()
    openAt({ x: event.clientX, y: event.clientY }, props.items)
  }

  function onSelect(info: MenuSelectInfo) {
    props.onSelect?.(info)
    updateOpen(false)
  }

  useDismiss({
    isOpen,
    onClose: function () {
      updateOpen(false)
    }
  })

  useEffect(
    function () {
      if (isControlled && props.open && !layer) {
        const el = triggerRef.current
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
        triggerRef.current = node
        assignRef(element.props.ref, node)
      }
    })
  } else {
    trigger = (
      <div
        ref={function (node) {
          triggerRef.current = node
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
        <AnimatePresence onExitComplete={clearLayer}>
          {isOpen && layer ? (
            <MenuLayer
              key="contextmenu-layer"
              layer={layer}
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
              onSelect={onSelect}
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

export type { ContextMenuProps, LayerState, MenuLayerProps }
export { Root, findDefaultContainer, MenuLayer }
