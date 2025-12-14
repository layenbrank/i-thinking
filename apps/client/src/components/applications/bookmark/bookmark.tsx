import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/bookmark/bookmark.module.scss'
import Marker from '@/components/applications/bookmark/marker.tsx'
import Overlay from '@/components/applications/bookmark/overlay.tsx'
import { generateColor } from '@/utils/generate.ts'
import clsx from 'clsx'
import type { MouseEvent } from 'react'
// import { Application } from '@/components/controller/controller.tsx'

export default function Bookmark(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)
	// const backgroundColor = useCallback(generateColor, [])

	const backgroundColor = useMemo(() => generateColor(), [])

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.bookmark)}>
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
