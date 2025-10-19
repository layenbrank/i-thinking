import AppController from '@/components/app-controller/app-controller.tsx'
import styles from '@/components/controller/controller.module.scss'

export default function Controller() {
	return (
		<div className={styles.controller}>
			<AppController />
		</div>
	)
}
