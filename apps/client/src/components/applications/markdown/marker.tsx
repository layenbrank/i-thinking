import type { MarkerProviderProps } from '@/components/application/application.tsx'
import Application from '@/components/application/application.tsx'
import styles from '@/components/applications/markdown/marker.module.scss'
import clsx from 'clsx'

interface Props extends Omit<MarkerProviderProps, 'children'> {}

export default function Marker(props: Props) {
	return (
		<Application.Marker
			{...props}
			className={clsx([styles.marker, props.size, props.direction, props.shape])}
		>
			markdown
		</Application.Marker>
	)
}
