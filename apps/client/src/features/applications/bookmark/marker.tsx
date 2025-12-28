import type { MarkerProviderProps } from '@/features/application/application.tsx'
import { Application } from '@/features/application/application.tsx'
import styles from '@/features/applications/bookmark/marker.module.scss'
import { clsx } from 'clsx'

interface Props extends Omit<MarkerProviderProps, 'children'> {
  // onUpdateVisible: (value: boolean) => void
}

export default function Marker(props: Props) {
  return (
    <Application.Marker
      {...props}
      className={clsx([styles.marker, props.size, props.direction, props.shape])}>
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
