import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/bookmark/index.module.scss'
import Marker from '@/components/applications/bookmark/marker.tsx'
import Overlay from '@/components/applications/bookmark/overlay.tsx'
import { generateColor } from '@/utils/generate.ts'
import clsx from 'clsx'
// import { Application } from '@/components/controller/controller.tsx'

export default function Bookmark(props: Application) {
	const [visible, onUpdateVisible] = useState(false)
	// const backgroundColor = useCallback(generateColor, [])

	const backgroundColor = useMemo(() => generateColor(), [])

	// useEffect(function () {
	// 	console.log('backgroundColor', backgroundColor)
	// })

	return (
		<Application {...props} className={clsx(styles.bookmark)}>
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
