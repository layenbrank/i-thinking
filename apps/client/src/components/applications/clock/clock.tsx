import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/clock/clock.module.scss'
import Marker from '@/components/applications/clock/marker.tsx'
import Overlay from '@/components/applications/clock/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Clock(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.clock)}>
			<Marker
				size={props.size}
				direction={props.direction}
				shape={props.shape}
				onDoubleClick={() => onUpdateVisible(true)}
			/>
			{visible && <Overlay visible={visible} onUpdateVisible={onUpdateVisible} />}
		</Application>
	)
}
