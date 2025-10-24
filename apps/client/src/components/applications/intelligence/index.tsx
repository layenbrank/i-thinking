import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/intelligence/index.module.scss'
import Marker from '@/components/applications/intelligence/marker.tsx'
import Overlay from '@/components/applications/intelligence/overlay.tsx'
import clsx from 'clsx'
export default function Intelligence(props: Application) {
	const [visible, onUpdateVisible] = useState(false)

	return (
		<Application {...props} className={clsx(styles.intelligence)}>
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
