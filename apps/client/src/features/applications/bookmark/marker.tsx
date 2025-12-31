import { clsx } from 'clsx'

import type { MarkerProps } from '@/features/application/application.tsx'
import { Application } from '@/features/application/application.tsx'
import styles from '@/features/applications/bookmark/marker.module.scss'

type Props = Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  return (
    <Application.Marker
      {...props}
      className={clsx([
        styles.marker,
        props.size,
        props.direction,
        props.shape
      ])}>
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
