import Application, { type ProviderProps } from '@/components/application/application.tsx'
import styles from '@/components/applications/markdown/markdown.module.scss'
import Marker from '@/components/applications/markdown/marker.tsx'
import Overlay from '@/components/applications/markdown/overlay.tsx'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

export default function Markdown(props: ProviderProps) {
	const [visible, onUpdateVisible] = useState(false)

	function onTrash(e: MouseEvent<HTMLElement>) {
		console.log('Trash clicked for', e)
	}

	return (
		<Application onTrash={onTrash} {...props} className={clsx(styles.markdown)}>
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
