import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/calendar/index.module.scss'
import Marker from '@/components/applications/calendar/marker.tsx'
import Overlay from '@/components/applications/calendar/overlay.tsx'
import clsx from 'clsx'
export default function Calendar(props: Application) {
	const [visible, onUpdateVisible] = useState(false)

	return (
		<Application {...props} className={clsx(styles.calendar)}>
			<Marker
				size={props.size}
				direction={props.direction}
				shape={props.shape}
				onDoubleClick={() => onUpdateVisible(true)}
			/>
			<Overlay visible={visible} onUpdateVisible={onUpdateVisible} />
		</Application>
	)
}
