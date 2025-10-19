import CalendarComponent from '@/components/applications/calendar/calendar.tsx'
import Controller from '@/components/controller/controller.tsx'
import styles from '@/views/overview/overview.module.scss'
import { Layout as Payload } from 'antd'

const { Content: Core, Header: Prefix, Footer: Suffix } = Payload

export default function Overview() {
	return (
		<Payload className={styles.payload}>
			<Prefix className={styles['overview-prefix']}> header </Prefix>
			<Core className={styles['overview-core']}>
				{/* <Controller /> */}
				<CalendarComponent draggable={true} />
			</Core>
			<Suffix className={styles['overview-suffix']}> footer </Suffix>
		</Payload>
	)
}
