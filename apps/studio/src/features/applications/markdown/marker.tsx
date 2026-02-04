import {
  Application,
  type MarkerProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/markdown/marker.module.scss'
import clsx from 'clsx'

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
      markdown
    </Application.Marker>
  )
}
