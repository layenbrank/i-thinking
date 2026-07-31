import { openUrl } from '@tauri-apps/plugin-opener'
import { Modal, Tooltip, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import { ContextMenu } from '@/components/contextmenu'
import { ABORT_TIMEOUT_MS } from '@/constants/magnetic-tile.ts'
import { buildLayoutMenuItems } from '@/features/magnetic-tile/build-layout-menu'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'
import styles from '@/features/magnetic-tile/magnetic-tile.module.scss'
import { Caption } from '@/features/magnetic-tile/caption'
import { OverlayContext } from '@/features/magnetic-tile/overlay-context'
import { registerShowOverlay } from '@/features/magnetic-tile/overlay-registry.ts'
import { startScreenshotCountdown } from '@/features/magnetic-tiles/screenshot/countdown.ts'

type Cache = 'destroy' | 'keepAlive'

interface SectionProps extends MagneticTile {
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
  onTrash?: MouseEventHandler<HTMLElement>
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

interface SectionContextProps {
  id: string
  component: MagneticTile.Component
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
  round: string | null
  background: MagneticTile.Background | null
}

interface MarkerProps {
  children: ReactNode
  onDoubleClick?: MouseEventHandler<HTMLElement>
  style?: CSSProperties
  className?: ClassValue
  size: MagneticTile.Size
  shape: MagneticTile.Shape
  direction: MagneticTile.Direction
}

const SectionContext = createContext<SectionContextProps | null>(null)

interface OverlayProps extends Omit<ModalProps, 'open' | 'footer'> {
  style?: CSSProperties
  /** false 隐藏顶栏；true / undefined 为默认 Caption；传入节点则整槽自定义 */
  caption?: ReactNode | boolean
  /** 默认顶栏中 Caption 左侧的扩展操作 */
  actions?: ReactNode
  /** 底栏操作区；不传则不渲染 */
  controls?: ReactNode
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

type OverlayControlProps = Pick<OverlayProps, 'cache' | 'onAbort' | 'abortTimeoutMs'>

interface OverlayProviderProps {
  children: ReactNode
  magneticTileID?: string
}

/**
 * 双击打开：特殊组件走侧通道，其余打开 Overlay。
 * Overlay 蒙层隔离交互，不 pause Mirror 滚动景深。
 */
function openByComponent(
  component: MagneticTile.Component,
  tile: Pick<MagneticTile, 'url'>,
  openOverlay: () => void
) {
  if (component === 'navigation') {
    if (!tile.url) return
    void openUrl(tile.url)
    return
  }
  if (component === 'screenshot') {
    startScreenshotCountdown()
    return
  }
  openOverlay()
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
      return registerShowOverlay(props.magneticTileID, updateVisible)
    },
    [props.magneticTileID, updateVisible]
  )

  const context = useMemo(
    function () {
      return {
        visible,
        renderable,
        fullscreen,
        // 对外仍用 onUpdate*，避免牵动各业务磁贴 workspace
        onUpdateVisible: updateVisible,
        onUpdateRenderable: setRenderable,
        onUpdateFullscreen: setFullscreen
      }
    },
    [visible, renderable, fullscreen, updateVisible]
  )

  return <OverlayContext value={context}>{props.children}</OverlayContext>
}

interface SkeletonProps {
  className?: ClassValue
  style?: CSSProperties
  id?: string
  size?: MagneticTile.Size
  shape?: MagneticTile.Shape
  direction?: MagneticTile.Direction
}

interface MagneticTileSuspenseProps extends SkeletonProps {
  children: ReactNode
  minDelayMs?: number
  fadeMs?: number
  skeletonClassName?: ClassValue
  skeletonStyle?: CSSProperties
}

const MagneticTile = {
  Marker(props: MarkerProps) {
    const section = useContext(SectionContext)

    const menuItems = useMemo(
      function () {
        if (!section) return []
        return buildLayoutMenuItems(section)
      },
      [section]
    )

    return (
      <ContextMenu items={menuItems}>
        <div
          style={props.style}
          onDoubleClick={props.onDoubleClick}
          className={clsx(styles.marker, props.className)}>
          {props.children}
        </div>
      </ContextMenu>
    )
  },
  Skeleton(props: SkeletonProps) {
    return (
      <div
        data-id={props.id}
        style={props.style}
        className={clsx(
          'magnetic-tile',
          'magnetic-tile-skeleton',
          styles.magneticTile,
          styles.skeleton,
          props.className,
          props.size ? styles[`lv${props.size}`] : null,
          props.shape ? styles[props.shape] : null,
          props.direction ? styles[props.direction] : null
        )}
      />
    )
  },
  Suspense(props: MagneticTileSuspenseProps) {
    return (
      <Suspense
        fallback={
          <MagneticTile.Skeleton
            id={props.id}
            size={props.size}
            shape={props.shape}
            direction={props.direction}
            style={props.skeletonStyle}
            className={clsx(props.className, props.skeletonClassName)}
          />
        }>
        {props.children}
      </Suspense>
    )
  },
  Caption,
  Overlay(props: OverlayProps) {
    const {
      className,
      width = '80%',
      height,
      onCancel,
      children,
      cache = 'destroy',
      onAbort,
      abortTimeoutMs = ABORT_TIMEOUT_MS,
      destroyOnHidden,
      caption,
      actions,
      controls,
      open: _open,
      ...remains
    } = props as OverlayProps & { open?: boolean }
    void _open
    const { visible, fullscreen, onUpdateVisible, onUpdateRenderable } = useContext(OverlayContext)

    const shouldDestroyOnHidden = cache === 'destroy' ? true : (destroyOnHidden ?? false)
    const hasCaption = caption !== false
    const hasControls = controls != null

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
      caption === false
        ? null
        : caption === true || caption === undefined || caption === null
          ? (
              <Caption actions={actions} />
            )
          : caption

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
        afterClose={handleAfterClose}
        width={fullscreen ? '100%' : width}
        height={fullscreen ? '100%' : height}
        style={{
          minWidth: fullscreen ? 'unset' : 600,
          borderRadius: fullscreen ? '0' : 'var(--ith-border-radius-lg)',
          aspectRatio: fullscreen ? 'unset' : '16 / 9',
          ...props.style
        }}
        styles={{
          container: {
            padding: 0,
            height: '100%',
            borderRadius: fullscreen ? '0' : 'var(--ith-border-radius-lg)',
            overflow: 'hidden'
          },
          header: {
            borderRadius: fullscreen ? '0' : 'var(--ith-border-radius-lg) var(--ith-border-radius-lg) 0 0'
          },
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column'
          },
          footer: hasControls
            ? {
                margin: 0,
                padding: 0,
                borderTop: 'none'
              }
            : undefined,
          ...props.styles
        }}
        className={clsx(
          'magnetic-tile-overlay',
          styles.overlay,
          className,
          hasCaption && styles.withCaption,
          hasControls && styles.withControls
        )}
        {...remains}
      />
    )
  },
  Section(props: SectionProps) {
    const nodeRef = useRef<HTMLDivElement>(null)
    // 默认近视口，避免首屏先空 surface 再挂 Marker 闪一下
    const [isNear, setIsNear] = useState(true)
    const { visible, onUpdateVisible } = useContext(OverlayContext)

    useEffect(
      function () {
        const el = nodeRef.current
        if (!el) return

        const root = el.closest('[data-mirror-scroller]') as HTMLElement | null
        const observer = new IntersectionObserver(
          function (entries) {
            for (const entry of entries) {
              // 滞回：进入即 true；离开后仍保持一屏缓冲（rootMargin）才 false
              setIsNear(entry.isIntersecting)
            }
          },
          {
            root: root ?? null,
            rootMargin: '100% 0px',
            threshold: 0
          }
        )
        observer.observe(el)
        return function () {
          observer.disconnect()
        }
      },
      []
    )

    const surfaceStyle = useMemo(
      function () {
        return buildSurfaceStyle({
          round: props.round,
          background: props.background
        })
      },
      [props.round, props.background]
    )

    return (
      <SectionContext.Provider
        value={{
          id: props.id,
          component: props.component,
          size: props.size,
          shape: props.shape,
          direction: props.direction,
          round: props.round,
          background: props.background
        }}>
        <div
          ref={nodeRef}
          onDoubleClick={function () {
            openByComponent(props.component, props, function () {
              onUpdateVisible(true)
            })
          }}
          data-id={props.id}
          // 仅 Sortable filter 禁拖；与 Mirror 滚动景深零耦合
          data-overlay-open={visible ? 'true' : undefined}
          className={clsx([
            'magnetic-tile',
            styles.magneticTile,
            props.className,
            styles[`lv${props.size}`],
            styles[props.shape],
            styles[props.direction]
          ])}
          style={props.style}>
          <div
            className={clsx('magnetic-tile-surface', styles.surface)}
            style={surfaceStyle}>
            {isNear ? props.children : null}
          </div>
          <span className={styles.title}>
            <Tooltip
              placement="bottom"
              title={props.title}
              autoAdjustOverflow={false}>
              <span>{props.title}</span>
            </Tooltip>
          </span>
          <div
            onClick={props.onTrash}
            className={clsx(styles.destroy, styles.marker)}>
            X
          </div>
        </div>
      </SectionContext.Provider>
    )
  }
}

export { MagneticTile, OverlayContext, OverlayProvider }

export type { Cache, MarkerProps, OverlayControlProps, OverlayProps, SectionProps }
