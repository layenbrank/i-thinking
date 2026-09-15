import { Dialog, DialogContent } from '@i-thinking/design/components/dialog'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { ABORT_TIMEOUT_MS } from '@/constants/magnetic-tile/components'
import styles from '@/features/magnetic-tile/magnetic-tile.module.scss'

type Cache = 'destroy' | 'keepAlive'

/** framed：配置弹层；fluid：工作台（morph） */
type OverlayMode = 'framed' | 'fluid'

/** 关闭手势：Esc / 点击遮罩 */
type DismissReason = 'escape' | 'overlay'

interface OverlayProps {
  children?: ReactNode
  className?: ClassValue
  style?: CSSProperties
  width?: CSSProperties['width']
  /** fluid 覆盖默认高度；framed 由 aspect-ratio 定高，忽略本值 */
  height?: CSSProperties['height']
  /** framed：配置弹层；fluid：工作台（morph） */
  mode?: OverlayMode
  /** 底栏操作区；不传则不渲染 */
  controls?: ReactNode
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
  destroyOnHidden?: boolean
  onCancel?: (reason: DismissReason) => void
}

type OverlayControlProps = Pick<OverlayProps, 'cache' | 'onAbort' | 'abortTimeoutMs'>

interface OverlayContextProps {
  visible: boolean
  renderable: boolean
  fullscreen: boolean
  onUpdateVisible: (value: boolean) => void
  onUpdateRenderable: (value: boolean) => void
  onUpdateFullscreen: (value: boolean) => void
}

interface OverlayProviderProps {
  children: ReactNode
  magneticTileID?: string
}

const WIDTH = '80%'

const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  renderable: false,
  fullscreen: false,
  onUpdateVisible: function (value) {
    void value
  },
  onUpdateRenderable: function (value) {
    void value
  },
  onUpdateFullscreen: function (value) {
    void value
  }
})

/** 主窗内：磁贴 id → Overlay 显隐回调 */
type VisibleFn = (visible: boolean) => void

const HANDLERS = new Map<string, VisibleFn>()

function bindOverlay(id: string, onVisible: VisibleFn) {
  HANDLERS.set(id, onVisible)
  return function unbind() {
    if (HANDLERS.get(id) === onVisible) HANDLERS.delete(id)
  }
}

/** 按磁贴 id 呈现 Overlay（须已 bind） */
function presentOverlay(id: string) {
  const onVisible = HANDLERS.get(id)
  if (!onVisible) {
    console.warn('[overlay] unbound id', id)
    return false
  }
  onVisible(true)
  return true
}

function useOverlayLazy(visible: boolean, cache: Cache) {
  const hasOpenedRef = useRef(false)

  if (visible) hasOpenedRef.current = true

  if (cache === 'destroy') return visible

  return visible || hasOpenedRef.current
}

function OverlayProvider(props: OverlayProviderProps) {
  const [visible, setVisible] = useState(false)
  const [renderable, setRenderable] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

  const updateVisible = useCallback(function (value: boolean) {
    setVisible(value)
    if (value) {
      setRenderable(true)
      return
    }
    setFullscreen(false)
  }, [])

  useEffect(
    function () {
      if (!props.magneticTileID) return
      return bindOverlay(props.magneticTileID, updateVisible)
    },
    [props.magneticTileID, updateVisible]
  )

  const context = useMemo(
    function () {
      return {
        visible,
        renderable,
        fullscreen,
        onUpdateVisible: updateVisible,
        onUpdateRenderable: setRenderable,
        onUpdateFullscreen: setFullscreen
      }
    },
    [visible, renderable, fullscreen, updateVisible]
  )

  return <OverlayContext value={context}>{props.children}</OverlayContext>
}

/**
 * MagneticTile Overlay Facade：尺寸走 CSS class，公开 props 为白名单。
 */
function Overlay(props: OverlayProps) {
  const {
    className,
    width = WIDTH,
    height,
    onCancel,
    children,
    cache = 'destroy',
    onAbort,
    abortTimeoutMs = ABORT_TIMEOUT_MS,
    destroyOnHidden,
    controls,
    style: styleProp,
    mode = 'framed'
  } = props
  const { visible, fullscreen, onUpdateVisible, onUpdateRenderable } = useContext(OverlayContext)

  const shouldDestroyOnHidden = cache === 'destroy' ? true : (destroyOnHidden ?? false)
  /** keepAlive：关闭后仍留在 DOM（iframe 不重载）；关闭态靠 .overlay[data-state='closed'] 隐藏 */
  const isKeepMounted = !shouldDestroyOnHidden

  const hasControls = controls !== null && controls !== undefined
  const isFluid = mode === 'fluid'

  async function handleAfterClose() {
    if (cache !== 'destroy') return

    onUpdateRenderable(false)
    if (!onAbort) return

    try {
      await Promise.race([
        onAbort(),
        new Promise<void>(function (resolve) {
          window.setTimeout(resolve, abortTimeoutMs)
        })
      ])
    } catch {
      // ignore cleanup errors to ensure forced unload
    }
  }

  function handleCancel(reason: DismissReason) {
    onUpdateVisible(false)
    onCancel?.(reason)
  }

  /** Esc / 遮罩 / 关闭按钮统一走这里；理由由 onEscapeKeyDown、onPointerDownOutside 补充 */
  function handleOpenChange(open: boolean) {
    if (open) return

    onUpdateVisible(false)
  }

  function handleEscapeKeyDown() {
    handleCancel('escape')
  }

  function handlePointerDownOutside() {
    handleCancel('overlay')
  }

  // 尺寸由 .framed / .fluid / .fullscreen 管；仅透传 style，fluid 可覆盖 height
  const overlayStyle: CSSProperties =
    !fullscreen && height !== null && height !== undefined
      ? { ...styleProp, height }
      : { ...styleProp }

  return (
    <Dialog
      open={visible}
      onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        forceMount={isKeepMounted ? true : undefined}
        data-slot="magnetic-tile-overlay"
        className={clsx(
          'magnetic-tile-overlay',
          styles.overlay,
          !fullscreen && (isFluid ? styles.fluid : styles.framed),
          fullscreen && styles.fullscreen,
          className
        )}
        style={{ ...overlayStyle, width: fullscreen ? '100%' : width }}
        onEscapeKeyDown={handleEscapeKeyDown}
        onPointerDownOutside={handlePointerDownOutside}
        onCloseAutoFocus={handleAfterClose}>
        <div className={styles.body}>{children}</div>
        {hasControls ? <div className={styles.controls}>{controls}</div> : null}
      </DialogContent>
    </Dialog>
  )
}

export { Overlay, OverlayContext, OverlayProvider, bindOverlay, presentOverlay, useOverlayLazy }
export type {
  Cache,
  OverlayContextProps,
  OverlayControlProps,
  OverlayMode,
  OverlayProps,
  OverlayProviderProps
}
