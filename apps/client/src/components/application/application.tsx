import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Modal, Tooltip, type ModalProps } from 'antd'
import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import styles from '@/components/application/application.module.scss'

// Context 用于共享 overlay 的 visible 状态
const OverlayContext = createContext<{
	visible: boolean
	updateVisible: (visible: boolean) => void
}>({
	visible: false,
	updateVisible: () => void 0
})

export const useOverlayContext = () => useContext(OverlayContext)

interface ProviderProps extends Application, Pick<Mirror, 'size' | 'direction' | 'shape'> {
	children: ReactNode
	style?: CSSProperties
	className?: ClassValue
	onTrash?: MouseEventHandler<HTMLElement>
}

interface MarkerProviderProps extends Pick<Mirror, 'size' | 'direction' | 'shape'> {
	onDoubleClick: MouseEventHandler<HTMLElement>
	children: ReactNode
	style?: CSSProperties
	className?: ClassValue
}

// interface ProviderProps {
// 	size: Mirror.Size
// 	shape: Mirror.Shape
// 	direction: Mirror.Direction
// }

interface OverlayProviderProps extends ModalProps {
	// children: ReactNode
	style?: CSSProperties
	fullscreen?: boolean
	// className?: ClassValue
}

function Provider(props: ProviderProps) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
		id: props.id
	})

	// 管理 overlay 状态
	const [overlayVisible, setOverlayVisible] = useState(false)

	// 如果有 overlay 打开，禁用拖拽监听器
	const finalListeners = overlayVisible ? {} : listeners

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
				backgroundSize: size ?? 'cover',
				backgroundColor: backgroundColor,
				backgroundImage: backgroundImage,
				'--application-round': round ?? '12px',
				backgroundRepeat: repeat ?? 'no-repeat',
				backgroundPosition: position ?? 'center',
				backgroundAttachment: attachment ?? 'fixed',
				transform: CSS.Transform.toString(transform),
				transition,
				cursor: 'move'
			}

			if (clip) design.backgroundClip = clip
			if (origin) design.backgroundOrigin = origin
			if (blendMode) design.backgroundBlendMode = blendMode

			return design
		},
		[props.background, props.backdrop, transform, isDragging]
	)

	return (
		<OverlayContext.Provider value={{ visible: overlayVisible, updateVisible: setOverlayVisible }}>
			<div
				ref={setNodeRef}
				{...attributes}
				{...finalListeners}
				data-id={props.id}
				className={clsx([
					styles.application,
					props.className,
					styles[props.size],
					styles[props.shape],
					styles[props.direction],
					{
						[styles.dragging]: isDragging
					}
				])}
				style={properties}
			>
				{props.children}
				<Tooltip placement="bottom" title={props.title} autoAdjustOverflow={false}>
					<span className={styles.title}>{props.title}</span>
				</Tooltip>
				<div onClick={props.onTrash} className={clsx(styles.destroy, styles.marker)}>
					X
				</div>
			</div>
		</OverlayContext.Provider>
	)
}

function MarkerProvider(props: MarkerProviderProps) {
	return (
		<div
			onDoubleClick={props.onDoubleClick}
			className={clsx(styles.marker, props.className)}
			style={props.style}
		>
			{props.children}
		</div>
	)
}

function OverlayProvider(props: OverlayProviderProps) {
	const { updateVisible } = useOverlayContext()
	const isOpen = props.open ?? false

	// 当 open 变化时，更新 Context
	useEffect(() => {
		updateVisible(isOpen)
	}, [isOpen, updateVisible])

	return (
		<Modal
			destroyOnHidden={true}
			maskClosable={true}
			closable={false}
			footer={null}
			title={null}
			centered={true}
			width={props.fullscreen ? '100%' : '80%'}
			height={props.fullscreen ? '100%' : 'unset'}
			style={{
				aspectRatio: props.fullscreen ? 'unset' : '16 / 9'
			}}
			{...props}
			open={isOpen}
			onCancel={(e) => (updateVisible(false), props.onCancel?.(e) ?? void 0)}
			className={clsx(['application-overlay', props.className])}
		>
			{props.children}
		</Modal>
	)
}

// 复合组件模式：将子组件附加到主组件上
const Application = Object.assign(Provider, {
	Marker: MarkerProvider,
	Overlay: OverlayProvider
})

export type { MarkerProviderProps, OverlayProviderProps, ProviderProps }

export default Application
