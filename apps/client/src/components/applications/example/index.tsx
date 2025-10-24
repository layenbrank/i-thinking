import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/example/index.module.scss'
import Marker from '@/components/applications/example/marker.tsx'
import Overlay from '@/components/applications/example/overlay.tsx'
import clsx from 'clsx'

export default function Example(props: Application) {
	const [visible, onUpdateVisible] = useState(false)

	return (
		<Application {...props} className={clsx(styles.example)}>
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
