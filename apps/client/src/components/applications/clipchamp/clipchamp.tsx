import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/clipchamp/clipchamp.module.scss'
import Marker from '@/components/applications/clipchamp/marker.tsx'
import Overlay from '@/components/applications/clipchamp/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function clipchamp(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.clipchamp)}>
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
