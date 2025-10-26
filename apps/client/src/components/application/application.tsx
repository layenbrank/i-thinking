import styles from '@/components/application/application.module.scss'
import { useSettingsMatch } from '@/components/application/application.ts'
import { Button, ConfigProvider, Flex, Modal, Segmented, Tooltip, type ModalProps } from 'antd'
import clsx, { type ClassValue } from 'clsx'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'

interface BasicProviderProps extends Application {
	children: ReactNode
	style?: CSSProperties
	className?: ClassValue
	onTrash?: MouseEventHandler<HTMLElement>
}

interface MarkerProviderProps extends Pick<Application, 'size' | 'direction' | 'shape'> {
	onDoubleClick: MouseEventHandler<HTMLElement>
	children: ReactNode
	style?: CSSProperties
	className?: ClassValue
}

interface OverlayProviderProps extends ModalProps {
	// children: ReactNode
	style?: CSSProperties
	// className?: ClassValue
}

function BasicProvider(props: BasicProviderProps) {
	const settings = useMemo(() => useSettingsMatch(props), [props])

	const background = useMemo(
		function () {
			const backgroundImage = `url(${props.backgroundImage}) no-repeat center / cover`
			if (props.backgroundImage) return backgroundImage
			if (props.backgroundColor) return props.backgroundColor
			return '#ffffff'
		},
		[props.backgroundImage, props.backgroundColor]
	)

	const round = useMemo(
		function () {
			return props.round ?? 'var(--app-global-round)'
		},
		[props.round]
	)

	return (
		<div
			draggable={true}
			data-id={props.id}
			className={clsx(styles.application, props.className)}
			style={{
				...props.style,
				// ...settings,
				'--app-size-width': settings.width,
				'--app-size-height': settings.height,
				'--app-grid-row': settings.gridRow,
				'--app-grid-column': settings.gridColumn,
				'--app-round': round,
				'--app-background': background
			}}
		>
			{props.children}
			<Tooltip placement="bottom" title={props.name} autoAdjustOverflow={false}>
				<span className={clsx(styles.name)}>{props.name}</span>
			</Tooltip>
			<div onClick={props.onTrash} className={clsx(styles.trash, styles.marker)}>
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
			width="80%"
			{...props}
			className={clsx(['application-overlay', props.className])}
		>
			{props.children}
		</Modal>
	)
}

// 复合组件模式：将子组件附加到主组件上
const Application = Object.assign(BasicProvider, {
	Marker: MarkerProvider,
	Overlay: OverlayProvider
})

export type { BasicProviderProps, MarkerProviderProps, OverlayProviderProps }

export { useSettingsMatch }

export default Application
