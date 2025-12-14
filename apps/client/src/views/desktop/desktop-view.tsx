import Controller from '@/components/controller/controller.tsx'
import { Layout } from 'antd'
import styles from './desktop.module.scss'

export default function DesktopView() {
	return (
		<Layout className={styles['desktop-view']}>
			<Layout.Header className={styles['desktop-header']}> header </Layout.Header>
			<Layout.Content className={styles['desktop-content']}>
				<Controller />
			</Layout.Content>
			<Layout.Footer className={styles['desktop-footer']}> footer </Layout.Footer>
		</Layout>
	)
}
