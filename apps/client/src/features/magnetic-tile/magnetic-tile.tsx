import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '@iconify/react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { Modal, Tooltip, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { createContext, Suspense } from 'react'

import { ContextMenu, type ContextMenuItem } from '@/components/contextmenu'
import { ABORT_TIMEOUT_MS } from '@/constants/magnetic-tile.ts'
import styles from '@/features/magnetic-tile/magnetic-tile.module.scss'
import { Caption } from '@/features/magnetic-tile/caption'
import { OverlayContext } from '@/features/magnetic-tile/overlay-context'
import { registerShowOverlay } from '@/features/magnetic-tile/overlay-registry.ts'
import { startScreenshotCountdown } from '@/features/magnetic-tiles/screenshot/countdown.ts'
import { isOverlayPanelKind } from '@/stores/overlay'
import { mountOverlayPanel, removeOverlayPanel } from '@/views/overlay/tauri'

type Cache = 'destroy' | 'keepAlive'

interface SectionProps extends MagneticTile {
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  onTrash?: MouseEventHandler<HTMLElement>
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

interface SectionContextProps {
  id: string
  component: MagneticTile.Component
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

interface MarkerProps {
  children: ReactNode
  onDoubleClick?: MouseEventHandler<HTMLElement>
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

const SectionContext = createContext<SectionContextProps | null>(null)

interface OverlayProps extends Omit<ModalProps, 'open'> {
  style?: CSSProperties
  /** false 隐藏顶栏；传入节点则整槽自定义；undefined 为默认 actions + Caption */
  caption?: ReactNode | false
  /** 默认顶栏中 Caption 左侧的扩展操作 */
  actions?: ReactNode
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

type OverlayControlProps = Pick<OverlayProps, 'cache' | 'onAbort' | 'abortTimeoutMs'>

interface OverlayProviderProps {
  children: ReactNode
  magneticTileID?: string
}

function OverlayProvider(props: OverlayProviderProps) {
  const [visible, onUpdateVisible] = useState(false)
  const [renderable, onUpdateRenderable] = useState(false)
  const [fullscreen, onUpdateFullscreen] = useState(false)

  const handleUpdateVisible = useCallback(function (value: boolean) {
    onUpdateVisible(value)
    if (value) {
      onUpdateRenderable(true)
      return
    }
    onUpdateFullscreen(false)
  }, [])

  useEffect(
    function () {
      if (!props.magneticTileID) return
      return registerShowOverlay(props.magneticTileID, handleUpdateVisible)
    },
    [props.magneticTileID, handleUpdateVisible]
  )

  const context = useMemo(
    function () {
      return {
        visible,
        renderable,
        fullscreen,
        onUpdateVisible: handleUpdateVisible,
        onUpdateRenderable,
        onUpdateFullscreen
      }
    },
    [visible, renderable, fullscreen, handleUpdateVisible]
  )

  return <OverlayContext value={context}>{props.children}</OverlayContext>
}

interface SkeletonProps {
  className?: ClassValue
  style?: CSSProperties
  size?: Mirror.Size
  shape?: Mirror.Shape
  direction?: Mirror.Direction
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
    const canMountPanel = section ? isOverlayPanelKind(section.component) : false

    const menuItems = useMemo(
      function (): ContextMenuItem[] {
        if (!section) return []
        return [
          {
            key: 'float',
            label: '浮层',
            icon: (
              <Icon
                icon="ant-design:block-outlined"
                width={14}
                height={14}
              />
            ),
            children: [
              {
                key: 'float-mount',
                label: '添加',
                icon: (
                  <Icon
                    icon="ant-design:plus-outlined"
                    width={14}
                    height={14}
                  />
                ),
                disabled: !canMountPanel,
                onClick() {
                  if (!isOverlayPanelKind(section.component)) return
                  void mountOverlayPanel(section.component, section.id, {
                    size: section.size,
                    shape: section.shape,
                    direction: section.direction
                  })
                }
              },
              {
                key: 'float-unmount',
                label: '移除',
                icon: (
                  <Icon
                    icon="ant-design:minus-outlined"
                    width={14}
                    height={14}
                  />
                ),
                disabled: !canMountPanel,
                onClick() {
                  if (!isOverlayPanelKind(section.component)) return
                  void removeOverlayPanel(section.component)
                }
              }
            ]
          }
        ]
      },
      [canMountPanel, section]
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
        style={props.style}
        className={clsx(
          styles.magneticTile,
          styles.skeleton,
          props.className,
          props.size ? styles[props.size] : null,
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
      open: _open,
      ...remains
    } = props as OverlayProps & { open?: boolean }
    void _open
    const { visible, fullscreen, onUpdateVisible, onUpdateRenderable } = useContext(OverlayContext)

    const shouldDestroyOnHidden = cache === 'destroy' ? true : (destroyOnHidden ?? false)

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

    const hasCaptionSlot = caption !== false
    const title =
      caption === false ? null : caption !== undefined && caption !== null ? (
        caption
      ) : (
        <Caption actions={actions} />
      )

    return (
      <Modal
        title={title}
        footer={null}
        open={visible}
        centered={true}
        closable={false}
        children={children}
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
          borderRadius: fullscreen ? '0' : '8px',
          aspectRatio: fullscreen ? 'unset' : '16 / 9',
          ...props.style
        }}
        styles={{
          container: {
            padding: 0,
            height: '100%',
            borderRadius: fullscreen ? '0' : 'var(--ith-border-radius-lg)'
          },
          header: {
            borderRadius: fullscreen ? '0' : '8px'
          },
          body: {
            padding: 0,
            height: '100%',
            display: 'flex',
            overflow: 'hidden',
            flexDirection: 'column'
          },
          ...props.styles
        }}
        className={clsx(['magnetic-tile-overlay', className, hasCaptionSlot && styles.withCaption])}
        {...remains}
      />
    )
  },
  Section(props: SectionProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
      id: props.id
    })

    const { visible, onUpdateVisible } = useContext(OverlayContext)

    const dragListeners = useMemo(
      function () {
        return visible ? {} : listeners
      },
      [visible, listeners]
    )

    const properties = useMemo(
      function () {
        const round = props.round
        const size = props.background?.size
        const clip = props.background?.clip
        const color = props.background?.color
        const image = props.background?.image
        const origin = props.background?.origin
        const repeat = props.background?.repeat
        const position = props.background?.position
        const blendMode = props.background?.blendMode
        const attachment = props.background?.attachment

        const backgroundImage = image ? `url(${image})` : undefined
        const backgroundColor = image ? undefined : (color ?? '#ffffff')

        const design: CSSProperties = {
          ...props.style,
          transition,
          backgroundSize: size ?? 'cover',
          backgroundColor: backgroundColor,
          backgroundImage: backgroundImage,
          '--magnetic-tile-round': round ?? '12px',
          backgroundRepeat: repeat ?? 'no-repeat',
          backgroundPosition: position ?? 'center',
          backgroundAttachment: attachment ?? 'fixed',
          transform: CSS.Transform.toString(transform)
        }

        if (clip) design.backgroundClip = clip
        if (origin) design.backgroundOrigin = origin
        if (blendMode) design.backgroundBlendMode = blendMode

        return design
      },
      [
        props.round,
        props.background?.size,
        props.background?.clip,
        props.background?.color,
        props.background?.image,
        props.background?.origin,
        props.background?.repeat,
        props.background?.position,
        props.background?.blendMode,
        props.background?.attachment,
        props.style,
        transition,
        transform
      ]
    )

    return (
      <SectionContext.Provider
        value={{
          id: props.id,
          component: props.component,
          size: props.size,
          shape: props.shape,
          direction: props.direction
        }}>
        <div
          {...dragListeners}
          onDoubleClick={function () {
            const handlers: Partial<Record<MagneticTile.Component, () => void>> = {
              navigation() {
                if (!props.url) return
                openUrl(props.url)
              },
              screenshot() {
                startScreenshotCountdown()
              }
            }
            const handler = handlers[props.component]
            if (handler) return handler()
            onUpdateVisible(true)
          }}
          {...attributes}
          ref={setNodeRef}
          data-id={props.id}
          className={clsx([
            'magnetic-tile',
            styles.magneticTile,
            props.className,
            styles[props.size],
            styles[props.shape],
            styles[props.direction],
            {
              [styles.dragging]: isDragging
            }
          ])}
          style={properties}>
          {props.children}
          <Tooltip
            placement="bottom"
            title={props.title}
            autoAdjustOverflow={false}>
            <span className={styles.title}>{props.title}</span>
          </Tooltip>
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
