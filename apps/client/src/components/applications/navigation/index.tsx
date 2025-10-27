import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/navigation/index.module.scss'
import Marker from '@/components/applications/navigation/marker.tsx'
import Overlay from '@/components/applications/navigation/overlay.tsx'
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { openUrl } from '@tauri-apps/plugin-opener'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Navigation(props: Application) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	function onRedirect(e: MouseEvent<HTMLElement>) {
		console.log('Marker double-clicked for', e)
		openUrl('https://www.baidu.com', 'chrome')
		new WebviewWindow('baidu', {
			url: 'https://www.baidu.com',
			width: 1200,
			height: 800,
			title: '百度',
			center: true
		})
		// window.open('https://www.example.com', '_blank')
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.navigation)}>
			<Marker
				size={props.size}
				direction={props.direction}
				shape={props.shape}
				// onDoubleClick={onRedirect}
				onDoubleClick={() => onUpdateVisible(true)}
			/>
			<Overlay visible={visible} onUpdateVisible={onUpdateVisible} />
		</Application>
	)
}
