import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/calendar/calendar.module.scss'
import Marker from '@/components/applications/calendar/marker.tsx'
import Overlay from '@/components/applications/calendar/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Calendar(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.calendar)}>
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
