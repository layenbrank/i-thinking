import Controller from '@/components/controller/controller.tsx'
import styles from '@/views/overview/overview.module.scss'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { Input, Layout as Payload } from 'antd'
import { clsx } from 'clsx'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
	function openDevTools() {
		getCurrentWebview()
		// 尝试通过代码打开 devtools
		// 具体方法可能需要查看 Tauri 的 API 文档
		console.log('尝试打开控制台')
	}
	useEffect(function () {
		openDevTools()
	}, [])
	return (
		<Payload className={clsx(styles.overview, styles.payload)}>
			<Prefix className={clsx(styles.overview, styles.prefix)}>
				<Input></Input>
			</Prefix>
			<Core className={clsx(styles.overview, styles.core)}>
				<Controller.Screen>
					<Controller.Application />
				</Controller.Screen>
			</Core>
			<Suffix className={clsx(styles.overview, styles.suffix)}>footer</Suffix>
		</Payload>
	)
}
