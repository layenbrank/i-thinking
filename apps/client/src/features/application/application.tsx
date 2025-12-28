import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Tooltip, type ModalProps } from 'antd'
import { clsx, type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import styles from '@/features/application/application.module.scss'

interface ProviderProps extends Application {
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
  onTrash?: MouseEventHandler<HTMLElement>
}

interface MarkerProviderProps {
  onDoubleClick: MouseEventHandler<HTMLElement>
  children: ReactNode
  style?: CSSProperties
  className?: ClassValue
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

interface OverlayProviderProps extends ModalProps {
  style?: CSSProperties
  fullscreen?: boolean
}

interface OverlayContextProps {
  visible: boolean
  mounted: boolean
  updateMounted: (value: boolean) => void
  updateVisible: (value: boolean) => void
}

// Context 用于共享 overlay 的 visible 状态
const OverlayContext = createContext<OverlayContextProps>({
  visible: false,
  mounted: false,
  updateMounted: (value) => void value,
  updateVisible: (value) => void value
})

function Provider(props: ProviderProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.id
  })

  // 管理 overlay 状态
  const [visible, updateVisible] = useState<boolean>(false)

  const [mounted, updateMounted] = useState<boolean>(false)

  const contextValue = useMemo(
    () => ({
      visible,
      mounted,
      updateMounted,
      updateVisible
    }),
    [visible, mounted]
  )

  // 如果有 overlay 打开，禁用拖拽监听器
  const listens = visible ? {} : listeners

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
    [props.background, props.backdrop, transform, isDragging]
  )

  return (
    <OverlayContext value={contextValue}>
      <div
        {...listens}
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
    </OverlayContext>
  )
}

function MarkerProvider(props: MarkerProviderProps) {
  const { visible, updateVisible, updateMounted } = useContext(OverlayContext)

  return (
    <div
      onDoubleClick={() => {
        console.log('onDoubleClick', visible)
        updateVisible(!visible)
        updateMounted(!visible)
      }}
      className={clsx(styles.marker, props.className)}
      style={props.style}>
      {props.children}
    </div>
  )
}

function OverlayProvider(props: OverlayProviderProps) {
  const { style, className, onCancel, children, ...remains } = props
  const { updateVisible, updateMounted, visible } = useContext(OverlayContext)

  function handleClose() {
    if (visible) return
    setTimeout(function () {
      updateMounted(false)
    }, 300)
  }

  // console.log('effect ===>', visible)

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
        aspectRatio: props.fullscreen ? 'unset' : '16 / 9'
      }}
      open={visible}
      onCancel={(e) => (updateVisible(false), onCancel?.(e) ?? void 0)}
      className={clsx(['application-overlay', className])}
      {...remains}>
      {children}
    </Modal>
  )
}

// 复合组件模式：将子组件附加到主组件上
const Application = Object.assign(Provider, {
  Marker: MarkerProvider,
  Overlay: OverlayProvider
})

export { Application, OverlayContext }

export type { MarkerProviderProps, OverlayProviderProps, ProviderProps }
