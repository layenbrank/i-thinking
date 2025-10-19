import styles from '@/components/applications/calendar/calendar.module.scss'
import { Calendar } from 'antd'

export default function CalendarComponent(props: AppComponentProps) {
	return (
		<div className={styles.calendar}>
			<Calendar />
		</div>
	)
}
