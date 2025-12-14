import { message } from 'antd'
import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { useState } from 'react'

import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

import Application, { type ProviderProps } from '@/components/application/application.tsx'
import Marker from '@/components/applications/navigation/marker.tsx'
import styles from '@/components/applications/navigation/navigation.module.scss'
import Overlay from '@/components/applications/navigation/overlay.tsx'

export default function Navigation(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)
	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	async function onRedirect(e: MouseEvent<HTMLElement>) {
		console.log('Marker double-clicked for', e)

		try {
			// 检查窗口是否已存在
			const existing = await WebviewWindow.getByLabel('baidu')
			if (existing) {
				// 如果窗口已存在，显示并聚焦
				await existing.show()
				await existing.setFocus()
				return
			}

			// 创建新窗口 - 明确设置所有必要的属性
			const webview = new WebviewWindow('baidu', {
				url: 'https://www.baidu.com',
				width: 1200,
				height: 800,
				title: '百度',
				center: true,
				closable: true,
				resizable: true,
				maximizable: true,
				minimizable: true,
				focus: true,
				focusable: true,
				visible: true,
				decorations: true,
				devtools: true,
				skipTaskbar: false
			})

			// 监听窗口创建成功事件
			webview.once('tauri://created', async function () {
				console.log('Webview created successfully')
				message.success('Webview created successfully')

				try {
					// 确保窗口显示并聚焦
					await webview.show()
					await webview.setFocus()
					console.log('Window shown and focused, URL should be loading...')
				} catch (err) {
					console.error('Error showing webview:', err)
				}
			})

			// 监听窗口创建错误事件
			webview.once('tauri://error', function (e) {
				message.error(`Failed to create webview: ${JSON.stringify(e)}`)
				console.error('Failed to create webview:', e)
			})
		} catch (error) {
			message.error(`Error: ${error}`)
			console.error('Error creating webview:', error)
		}
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
