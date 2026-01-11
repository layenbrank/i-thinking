import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Tooltip, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'

import styles from '@/features/application/application.module.scss'

interface SectionProps extends Application {
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  onTrash?: MouseEventHandler<HTMLElement>
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
}

interface OverlayContextProps {
  visible: boolean
  mounted: boolean
  onUpdateVisible: (value: boolean) => void
  onUpdateMounted: (value: boolean) => void
}

const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  mounted: false,
  onUpdateVisible: (value) => void value,
  onUpdateMounted: (value) => void value
})

interface OverlayProviderProps {
  children: ReactNode
}

function OverlayProvider(props: OverlayProviderProps) {
  const [visible, onUpdateVisible] = useState<boolean>(false)
  const [mounted, onUpdateMounted] = useState<boolean>(true)

  const context = useMemo(
    function () {
      return {
        visible,
        mounted,
        onUpdateVisible,
        onUpdateMounted
      }
    },
    [visible, mounted]
  )

  return <OverlayContext value={context}>{props.children}</OverlayContext>
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
  Overlay(props: OverlayProps) {
    const { style, className, onCancel, children, ...remains } = props
    const { visible, onUpdateVisible, onUpdateMounted } =
      useContext(OverlayContext)

    function handleClose() {
      if (visible) return
      setTimeout(function () {
        onUpdateMounted(false)
      }, 300)
    }

    function handleCancel(e: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
      onUpdateVisible(false)
      onCancel?.(e)
    }

    return (
      <Modal
        destroyOnHidden={true}
        maskClosable={true}
        closable={false}
        footer={null}
        title={null}
        centered={true}
        afterClose={handleClose}
        width={props.fullscreen ? '100%' : '80%'}
        height={props.fullscreen ? '100%' : 'unset'}
        style={{
          ...style,
          borderRadius: props.fullscreen ? '0px' : '8px',
          aspectRatio: props.fullscreen ? 'unset' : '16 / 9'
        }}
        open={visible}
        onCancel={handleCancel}
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

export type { MarkerProps, OverlayProps, SectionProps }
