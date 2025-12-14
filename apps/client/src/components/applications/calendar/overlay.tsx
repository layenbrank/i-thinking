import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/calendar/overlay.module.scss'
import clsx from 'clsx'
import { Calendar } from 'antd'

interface Props {
	visible: boolean
	onUpdateVisible: (value: boolean) => void
}

export default function Overlay(props: Props) {
	return (
		<Application.Overlay
			open={props.visible}
			onCancel={() => props.onUpdateVisible(false)}
			onOk={() => props.onUpdateVisible(false)}
		>
			<Calendar
				styles={{
					content: {
						height: '100%'
					}
				}}
				classNames={{
					body: clsx([styles.calendar, styles.body, 'body===>>>']),
					content: clsx([styles.calendar, styles.content, 'content===>>>']),
					header: clsx([styles.calendar, styles.header, 'header===>>>']),
					item: clsx([styles.calendar, styles.item, 'item===>>>']),
					root: clsx([styles.calendar, styles.root, 'root===>>>'])
				}}
			></Calendar>
			{/* <div className={styles.overlay}>Overlay</div> */}
		</Application.Overlay>
	)
}
