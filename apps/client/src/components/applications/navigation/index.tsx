import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/navigation/index.module.scss'
import Marker from '@/components/applications/navigation/marker.tsx'
import Overlay from '@/components/applications/navigation/overlay.tsx'
import clsx from 'clsx'

export default function Navigation(props: Application) {
	const [visible, onUpdateVisible] = useState(false)

	return (
		<Application {...props} className={clsx(styles.navigation)}>
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
