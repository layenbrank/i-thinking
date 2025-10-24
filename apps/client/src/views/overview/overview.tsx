import Controller from '@/components/controller/controller.tsx'
import styles from '@/views/overview/overview.module.scss'
import { Layout as Payload } from 'antd'
import { clsx } from 'clsx'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
	return (
		<Payload className={clsx(styles.overview, styles.payload)}>
			<Prefix className={clsx(styles.overview, styles.prefix)}>header</Prefix>
			<Core className={clsx(styles.overview, styles.core)}>
				<Controller.Screen>
					<Controller.Application />
				</Controller.Screen>
			</Core>
			<Suffix className={clsx(styles.overview, styles.suffix)}>footer</Suffix>
		</Payload>
	)
}
