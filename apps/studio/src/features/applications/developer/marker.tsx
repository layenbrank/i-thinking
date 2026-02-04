import clsx from 'clsx'

import {
  Application,
  type MarkerProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/developer/marker.module.scss'

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
      developer
    </Application.Marker>
  )
}
