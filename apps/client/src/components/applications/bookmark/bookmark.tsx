import styles from '@/components/applications/bookmark/bookmark.module.scss'
import { generateColor } from '@/utils/generate.ts'

export default function Bookmark(props: AppComponentProps) {
	return (
		<div
			style={{
				backgroundColor: generateColor()
			}}
			data-id={props.id}
			draggable={props.draggable}
			className={styles.bookmark}
		>
			{props.name}
		</div>
	)
}
