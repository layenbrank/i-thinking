import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { message } from 'antd'

import { openUrl } from '@tauri-apps/plugin-opener'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

import Marker from '@/components/applications/navigation/marker.tsx'
import Overlay from '@/components/applications/navigation/overlay.tsx'
import styles from '@/components/applications/navigation/navigation.module.scss'
import Application, { type ProviderProps } from '@/components/application/application.tsx'

export default function Navigation(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	function onRedirect(e: MouseEvent<HTMLElement>) {
		console.log('Marker double-clicked for', e)
		openUrl('https://www.baidu.com', 'chrome')

		// const webview = new WebviewWindow('baidu', {
		// 	url: 'https://www.baidu.com',
		// 	width: 1200,
		// 	height: 800,
		// 	title: '百度',
		// 	center: true
		// } )

		const webview = new WebviewWindow('baidu', {
			url: 'https://www.baidu.com',
			width: 1200,
			height: 800,
			title: '百度',
			closable: true,
			resizable: true,
			devtools: true,
			center: true
		})

		webview.once('tauri://created', function () {
			message.success('Webview created successfully')
		})
		webview.once('tauri://error', function (e) {
			message.error(`Failed to create webview:`)
			console.error('Failed to create webview:', e)
		})
		webview.close()
		// window.open('https://www.example.com', '_blank')
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.navigation)}>
			<Marker
				size={props.size}
				direction={props.direction}
				shape={props.shape}
				onDoubleClick={onRedirect}
				// onDoubleClick={() => onUpdateVisible(true)}
			/>
			<Overlay visible={visible} onUpdateVisible={onUpdateVisible} />
		</Application>
	)
}
