import styles from '@/components/application/application.module.scss'
import { Button, ConfigProvider, Flex, Modal, Segmented, Tooltip, type ModalProps } from 'antd'
import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'

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
				backgroundAttachment: attachment ?? 'fixed'
			}

			if (clip) design.backgroundClip = clip
			if (origin) design.backgroundOrigin = origin
			if (blendMode) design.backgroundBlendMode = blendMode

			return design
		},
		[props.background, props.backdrop]
	)

	return (
		<div
			draggable={true}
			data-id={props.id}
			className={clsx([
				styles.application,
				props.className,
				styles[props.size],
				styles[props.shape],
				styles[props.direction]
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

export type { ProviderProps, MarkerProviderProps, OverlayProviderProps }

export default Application
