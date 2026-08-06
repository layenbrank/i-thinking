import { Modal, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, ReactNode } from 'react'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { ABORT_TIMEOUT_MS } from '@/constants/magnetic-tile/components'
import { Caption } from '@/features/magnetic-tile/caption'
import styles from '@/features/magnetic-tile/magnetic-tile.module.scss'

type Cache = 'destroy' | 'keepAlive'

/** framed：配置弹层；fluid：工作台（morph） */
type OverlayMode = 'framed' | 'fluid'

type OverlayStyles = Exclude<ModalProps['styles'], (...args: never[]) => unknown>

interface OverlayProps {
  children?: ReactNode
  className?: ClassValue
  wrapClassName?: string
  style?: CSSProperties
  /**
   * 仅支持对象形式；函数式 styles 会被忽略（antd Modal 兼容形态，壳层不透传）。
   */
  styles?: OverlayStyles
  width?: ModalProps['width']
  /** fluid 覆盖默认高度；framed 由 aspect-ratio 定高，忽略本值 */
  height?: CSSProperties['height']
  /** framed：配置弹层；fluid：工作台（morph） */
  mode?: OverlayMode
  /** false 隐藏顶栏；true / undefined 为默认 Caption；传入节点则整槽自定义 */
  caption?: ReactNode | boolean
  /** 底栏操作区；不传则不渲染 */
  controls?: ReactNode
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
  destroyOnHidden?: boolean
  onCancel?: ModalProps['onCancel']
  onOk?: ModalProps['onOk']
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
    wrapClassName,
    width = WIDTH,
    height,
    onCancel,
    onOk,
    children,
    cache = 'destroy',
    onAbort,
    abortTimeoutMs = ABORT_TIMEOUT_MS,
    destroyOnHidden,
    caption,
    controls,
    style: styleProp,
    styles: stylesProp,
    mode = 'framed'
  } = props
  const { visible, fullscreen, onUpdateVisible, onUpdateRenderable } = useContext(OverlayContext)

  const shouldDestroyOnHidden = cache === 'destroy' ? true : (destroyOnHidden ?? false)
  const hasCaption = caption !== false
  const hasControls = (controls !== null && controls !== undefined)
  const isFluid = mode === 'fluid'
  const styleSlots = stylesProp

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

  function handleCancel(
    e: React.MouseEvent<HTMLButtonElement, MouseEvent> | React.KeyboardEvent<HTMLElement>
  ) {
    onUpdateVisible(false)
    onCancel?.(e)
  }

  const title =
    caption === false ? null : caption === true || caption === undefined || caption === null ? (
      <Caption />
    ) : (
      caption
    )

  // 尺寸由 .framed / .fluid / .fullscreen 管；仅透传 style，fluid 可覆盖 height
  const overlayStyle: CSSProperties =
    !fullscreen && (height !== null && height !== undefined) ? { ...styleProp, height } : { ...styleProp }

  return (
    <Modal
      title={title}
      footer={hasControls ? <div className={styles.controls}>{controls}</div> : null}
      open={visible}
      centered={true}
      closable={false}
      children={<div className={styles.body}>{children}</div>}
      mask={{
        closable: true,
        enabled: true
      }}
      destroyOnHidden={shouldDestroyOnHidden}
      onCancel={handleCancel}
      onOk={onOk}
      afterClose={handleAfterClose}
      width={fullscreen ? '100%' : width}
      wrapClassName={wrapClassName}
      style={overlayStyle}
      styles={{
        container: {
          padding: 0,
          height: '100%',
          borderRadius: fullscreen ? '0' : 'var(--ith-border-radius-lg)',
          overflow: 'hidden',
          ...styleSlots?.container
        },
        header: {
          borderRadius: fullscreen
            ? '0'
            : 'var(--ith-border-radius-lg) var(--ith-border-radius-lg) 0 0',
          ...styleSlots?.header
        },
        body: {
          padding: 0,
          height: '100%',
          display: 'flex',
          overflow: 'hidden',
          flexDirection: 'column',
          ...styleSlots?.body
        },
        footer: hasControls
          ? {
              margin: 0,
              padding: 0,
              borderTop: 'none',
              ...styleSlots?.footer
            }
          : styleSlots?.footer
      }}
      className={clsx(
        'magnetic-tile-overlay',
        styles.overlay,
        !fullscreen && (isFluid ? styles.fluid : styles.framed),
        fullscreen && styles.fullscreen,
        className,
        hasCaption && styles.withCaption,
        hasControls && styles.withControls
      )}
    />
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
