import { generateColor } from '@/utils/generate.ts'
import styles from './app-bookmark.module.scss'

export default function AppBookmark(props: AppComponentProps) {
	return (
		<div
			style={{
				backgroundColor: generateColor()
			}}
			data-id={props.id}
			draggable={props.draggable}
			className={styles['app-bookmark']}
		>
			{props.name}
		</div>
	)
}
