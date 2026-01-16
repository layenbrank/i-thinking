import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Tooltip, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { Suspense } from 'react'

import { DEFAULT_ABORT_TIMEOUT_MS } from '@/constants/application.ts'
import styles from '@/features/application/application.module.scss'

type Cache = 'destroy' | 'keepAlive'

interface SectionProps extends Application {
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

interface MarkerProps {
  children: ReactNode
  onDoubleClick?: MouseEventHandler<HTMLElement>
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

interface OverlayProps extends ModalProps {
  style?: CSSProperties
  fullscreen?: boolean
  cache?: Cache
  onAbort?: () => Promise<void>
  abortTimeoutMs?: number
}

type OverlayControlProps = Pick<
  OverlayProps,
  'cache' | 'onAbort' | 'abortTimeoutMs'
>

interface OverlayContextProps {
  visible: boolean
  renderable: boolean
  onUpdateVisible: (value: boolean) => void
  onUpdateRenderable: (value: boolean) => void
}

const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  renderable: false,
  onUpdateVisible: (value) => void value,
  onUpdateRenderable: (value) => void value
})

interface OverlayProviderProps {
  children: ReactNode
}

function OverlayProvider(props: OverlayProviderProps) {
  const [visible, onUpdateVisible] = useState<boolean>(false)
  const [renderable, onUpdateRenderable] = useState<boolean>(false)

  const handleUpdateVisible = useCallback(function (value: boolean) {
    onUpdateVisible(value)
    if (value) onUpdateRenderable(true)
  }, [])

  const context = useMemo(
    function () {
      return {
        visible,
        renderable,
        onUpdateVisible: handleUpdateVisible,
        onUpdateRenderable
      }
    },
    [visible, renderable, handleUpdateVisible]
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

interface ApplicationSuspenseProps extends SkeletonProps {
  children: ReactNode
  minDelayMs?: number
  fadeMs?: number
  skeletonClassName?: ClassValue
  skeletonStyle?: CSSProperties
}

// interface SectionContextProps {}
//
// const SectionContext = createContext<SectionContextProps>()

// const MarkerContext = createContext()

// 复合组件模式：将子组件附加到主组件上
const Application = {
  Marker(props: MarkerProps) {
    return (
      <div
        style={props.style}
        onDoubleClick={props.onDoubleClick}
        className={clsx(styles.marker, props.className)}>
        {props.children}
      </div>
    )
  },
  Skeleton(props: SkeletonProps) {
    return (
      <div
        style={props.style}
        className={clsx(
          styles.application,
          styles.skeleton,
          props.className,
          props.size ? styles[props.size] : null,
          props.shape ? styles[props.shape] : null,
          props.direction ? styles[props.direction] : null
        )}
      />
    )
  },
  Suspense(props: ApplicationSuspenseProps) {
    return (
      <Suspense
        fallback={
          <Application.Skeleton
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
  Overlay(props: OverlayProps) {
    const {
      style,
      className,
      onCancel,
      children,
      cache,
      onAbort,
      abortTimeoutMs,
      destroyOnHidden,
      ...remains
    } = props
    const { visible, onUpdateVisible, onUpdateRenderable } =
      useContext(OverlayContext)

    const resolvedCache = cache ?? 'destroy'
    const resolvedAbortTimeoutMs = abortTimeoutMs ?? DEFAULT_ABORT_TIMEOUT_MS
    const resolvedDestroy =
      resolvedCache === 'destroy' ? true : (destroyOnHidden ?? false)

    async function handleAfterClose() {
      if (resolvedCache !== 'destroy') return

      onUpdateRenderable(false)
      if (!onAbort) return

      try {
        await Promise.race([
          onAbort(),
          new Promise<void>(function (resolve) {
            window.setTimeout(resolve, resolvedAbortTimeoutMs)
          })
        ])
      } catch {
        // ignore cleanup errors to ensure forced unload
      }
    }

    function handleCancel(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      onUpdateVisible(false)
      onCancel?.(e)
    }

    return (
      <Modal
        title={null}
        footer={null}
        open={visible}
        centered={true}
        closable={false}
        maskClosable={true}
        destroyOnHidden={resolvedDestroy}
        onCancel={handleCancel}
        afterClose={handleAfterClose}
        afterOpenChange={(open) => {
          console.log('afterOpenChange', open)
        }}
        width={props.fullscreen ? '100%' : '80%'}
        height={props.fullscreen ? '100%' : 'unset'}
        style={{
          ...style,
          borderRadius: props.fullscreen ? '0px' : '8px',
          aspectRatio: props.fullscreen ? 'unset' : '16 / 9'
        }}
        className={clsx(['application-overlay', className])}
        {...remains}>
        {children}
      </Modal>
    )
  },
  Section(props: SectionProps) {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging
    } = useSortable({
      id: props.id
    })

    const { visible, onUpdateVisible } = useContext(OverlayContext)

    const listens = useMemo(
      function () {
        return visible ? {} : listeners
      },
      [visible, listeners]
    )

    // console.log('Section', '\nvisible', visible, '\nlisteners', listeners)

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
          '--application-round': round ?? '12px',
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
      <div
        {...listens}
        onDoubleClick={() => onUpdateVisible(true)}
        {...attributes}
        ref={setNodeRef}
        data-id={props.id}
        className={clsx([
          'application',
          styles.application,
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
    )
  }
}

export { Application, OverlayContext, OverlayProvider }

export type {
  Cache,
  MarkerProps,
  OverlayControlProps,
  OverlayProps,
  SectionProps
}
