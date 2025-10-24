import type { MarkerProps } from '@/components/application/application.tsx'
import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/bookmark/marker.module.scss'
import { clsx } from 'clsx'

interface Props extends Omit<MarkerProps, 'children'> {
	// onUpdateVisible: (value: boolean) => void
}

export default function Marker(props: Props) {
	return (
		<Application.Marker
			{...props}
			className={clsx([styles.marker, props.size, props.direction, props.shape])}
		>
			bookmark
		</Application.Marker>
	)
}

// return (
// 	<div
// 		onClick={() => props.onUpdateVisible(true)}
// 		className={clsx([styles.marker, styles.medium, styles.square, styles.horizontal])}
// 	>
// 		Marker
// 	</div>
// )
