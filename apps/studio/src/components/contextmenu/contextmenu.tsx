import { clsx } from 'clsx'
import { AnimatePresence, motion as Motion } from 'motion/react'
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref
} from 'react'
import { createPortal } from 'react-dom'

import { useDismiss, findFocusable, parseMenuItems } from '@/components/contextmenu/menu'
import type {
  MenuClassNames,
  MenuItem,
  MenuMotion,
  MenuSelectInfo,
  MenuStyles,
  ParsedMenuItem
} from '@/components/contextmenu/menu'
import { Surface } from '@/components/contextmenu/surface'
import { VIEWPORT_PADDING, type Point } from '@/components/contextmenu/position'

import '@/components/contextmenu/contextmenu.scss'

const SHELL_MOTION = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12 }
}

/** 默认 trigger：clone 时写入 data-contextmenu-trigger */
const TRIGGER = '[data-contextmenu-trigger]'

interface ContextMenuProps {
  /** 静态菜单；与 findItems 二选一，findItems 优先 */
  items?: MenuItem[]
  /** 按命中的 trigger 节点解析菜单（委托场景） */
  findItems?: (trigger: Element) => MenuItem[]
  children?: ReactNode
  disabled?: boolean
  visible?: boolean
  /** closest 选择器；自定义时不烙默认 data，由 root 委托 */
  trigger?: string
  className?: string
  classNames?: MenuClassNames
  styles?: MenuStyles
  motion?: MenuMotion
  offset?: [number, number]
  submenuOffset?: [number, number]
  boundaryPadding?: number
  expandDelay?: number
  collapseDelay?: number
  /** Portal 挂载点，默认 document.body */
  onTeleport?: () => HTMLElement
  renderItem?: (item: ParsedMenuItem, node: ReactNode) => ReactNode
  renderSurface?: (nodes: ReactNode, meta: { level: number; items: ParsedMenuItem[] }) => ReactNode
  /** 显隐受控回调 */
  onUpdateVisible?: (visible: boolean) => void
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
  'data-contextmenu-trigger'?: string
}

function isInRoot(root: HTMLElement | null, node: Element | null) {
  if (!root || !node) return false
  return node === root || root.contains(node)
}

function pickItems(props: ContextMenuProps, trigger: Element) {
  if (props.findItems) return props.findItems(trigger)
  return props.items ?? []
}

interface MenuLayerProps {
  layer: LayerState
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
  renderItem?: ContextMenuProps['renderItem']
  renderSurface?: ContextMenuProps['renderSurface']
  onUpdatePath: (path: string[]) => void
  onUpdateActive: (key: string | undefined) => void
  onSelect: (info: MenuSelectInfo) => void
  onClose: () => void
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
      className="contextmenu-root"
      initial={SHELL_MOTION.initial}
      animate={SHELL_MOTION.animate}
      exit={SHELL_MOTION.exit}
      transition={SHELL_MOTION.transition}>
      <Surface
        items={props.layer.items}
        level={0}
        keyPath={[]}
        path={props.path}
        activeKey={props.activeKey}
        classNames={props.classNames}
        styles={props.styles}
        motion={props.motion}
        offset={props.offset}
        submenuOffset={props.submenuOffset}
        boundaryPadding={props.boundaryPadding ?? VIEWPORT_PADDING}
        expandDelay={props.expandDelay}
        collapseDelay={props.collapseDelay}
        container={props.container}
        anchor={props.layer.anchor}
        placement="pointer"
        renderItem={props.renderItem}
        renderSurface={props.renderSurface}
        onpathChange={props.onUpdatePath}
        onUpdateActive={props.onUpdateActive}
        onSelect={props.onSelect}
        onClose={props.onClose}
      />
    </Motion.div>
  )
}

function Root(props: ContextMenuProps) {
  // 进 hook 依赖的值先解构出来：直接写 `props.x` 会被 exhaustive-deps 要求把整个 props 当依赖
  const {
    disabled,
    findItems,
    items: menuItems,
    onUpdateVisible,
    visible: controlledVisible
  } = props
  const isControlled = controlledVisible !== undefined
  const isDelegate = props.trigger !== null && props.trigger !== undefined
  const [innerVisible, setInnerVisible] = useState(false)
  const [layer, setLayer] = useState<LayerState | null>(null)
  const [session, setSession] = useState(0)
  const [path, setPath] = useState<string[]>([])
  const [activeKey, setActiveKey] = useState<string | undefined>()
  const rootRef = useRef<HTMLElement | null>(null)

  const visible = isControlled ? Boolean(controlledVisible) : innerVisible
  const triggerSelector = props.trigger ?? TRIGGER

  const updateVisible = useCallback(
    function (next: boolean) {
      if (!isControlled) setInnerVisible(next)
      onUpdateVisible?.(next)
      if (!next) {
        setPath([])
        setActiveKey(undefined)
      }
    },
    [isControlled, onUpdateVisible]
  )

  const bindRoot = useCallback(function (node: HTMLElement | null) {
    rootRef.current = node
  }, [])

  // 触发节点既要进 rootRef，也要转交调用方自带的 ref（原始 child 的 ref）
  // 触发节点既要进 rootRef，也要转交调用方自带的 ref（原始 child 的 ref）
  const childRef = isValidElement(props.children)
    ? (props.children as ReactElement<TriggerElementProps>).props.ref
    : undefined
  const bindTriggerRef = useCallback(
    function (node: HTMLElement | null) {
      rootRef.current = node
      assignRef(childRef, node)
    },
    [childRef]
  )

  function clearLayer() {
    setLayer(null)
    setPath([])
    setActiveKey(undefined)
  }

  const presentAt = useCallback(
    function (point: Point, items: MenuItem[]) {
      if (disabled) return
      if (!items.length) return
      const parsed = parseMenuItems(items)
      const focusable = findFocusable(parsed)
      // 换 session key 重播入场；onExitComplete 仅在关闭时清 layer，避免拆掉新层
      setSession(function (n) {
        return n + 1
      })
      setLayer({ anchor: point, items: parsed })
      setPath([])
      setActiveKey(focusable[0]?.key)
      if (!isControlled) setInnerVisible(true)
      onUpdateVisible?.(true)
    },
    [disabled, isControlled, onUpdateVisible]
  )

  function onContextMenu(event: ReactMouseEvent) {
    if (props.disabled) return
    if (event.shiftKey) return

    const target = event.target
    if (!(target instanceof Element)) return
    const node = target.closest(triggerSelector)
    if (!node || !isInRoot(rootRef.current, node)) return

    const items = pickItems(props, node)
    if (!items.length) return

    event.preventDefault()
    event.stopPropagation()
    presentAt({ x: event.clientX, y: event.clientY }, items)
  }

  function onSelect(info: MenuSelectInfo) {
    props.onSelect?.(info)
    updateVisible(false)
  }

  useDismiss({
    visible,
    onClose() {
      updateVisible(false)
    }
  })

  // 已打开时：capture 阶段若 closest 非本 root 内 trigger，关闭自身
  useEffect(
    function () {
      if (!visible) return

      function onDocumentContextMenu(event: MouseEvent) {
        const target = event.target
        if (!(target instanceof Element)) {
          updateVisible(false)
          return
        }
        const node = target.closest(triggerSelector)
        if (!isInRoot(rootRef.current, node)) {
          updateVisible(false)
        }
      }

      document.addEventListener('contextmenu', onDocumentContextMenu, true)
      return function () {
        document.removeEventListener('contextmenu', onDocumentContextMenu, true)
      }
    },
    [updateVisible, visible, triggerSelector]
  )

  useEffect(
    function () {
      if (isControlled && controlledVisible && !layer) {
        const el = rootRef.current
        if (!el) return
        const box = el.getBoundingClientRect()
        const items = findItems ? findItems(el) : (menuItems ?? [])
        presentAt({ x: box.left + box.width / 2, y: box.top + box.height / 2 }, items)
      }
    },
    [controlledVisible, findItems, isControlled, layer, menuItems, presentAt]
  )

  const child = props.children
  let trigger: ReactNode = child

  if (child === undefined || child === null) trigger = null
  else if (isValidElement(child)) {
    const element = child as ReactElement<TriggerElementProps>
    // eslint-disable-next-line react-hooks/refs -- cloneElement 传 ref 是官方用法，规则只认 JSX 上的 ref 属性
    trigger = cloneElement(element, {
      className: clsx(element.props.className, props.className, props.classNames?.root),
      ...(isDelegate ? {} : { 'data-contextmenu-trigger': '' }),
      onContextMenu(event: ReactMouseEvent) {
        element.props.onContextMenu?.(event)
        onContextMenu(event)
      },
      ref: bindTriggerRef
    })
  } else {
    trigger = (
      <div
        ref={bindRoot}
        {...(isDelegate ? {} : { 'data-contextmenu-trigger': '' })}
        className={clsx('contextmenu-trigger', props.className, props.classNames?.root)}
        style={props.styles?.root}
        onContextMenu={onContextMenu}>
        {child}
      </div>
    )
  }

  const container = props.onTeleport?.() ?? document.body

  return (
    <>
      {trigger}
      {createPortal(
        <AnimatePresence
          onExitComplete={function () {
            // 已打开时 session remount 也会触发 exit；仅真正关闭后清 layer
            // （回调由本次渲染创建，AnimatePresence 调用的就是最新的这份，直接读 visible 即可）
            if (!visible) clearLayer()
          }}>
          {visible && layer ? (
            <MenuLayer
              key={`contextmenu-${session}`}
              layer={layer}
              path={path}
              activeKey={activeKey}
              classNames={props.classNames}
              styles={props.styles}
              motion={props.motion}
              offset={props.offset}
              submenuOffset={props.submenuOffset}
              boundaryPadding={props.boundaryPadding}
              expandDelay={props.expandDelay}
              collapseDelay={props.collapseDelay}
              container={container}
              renderItem={props.renderItem}
              renderSurface={props.renderSurface}
              onUpdatePath={setPath}
              onUpdateActive={setActiveKey}
              onSelect={onSelect}
              onClose={function () {
                updateVisible(false)
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
export { Root, MenuLayer, TRIGGER }
