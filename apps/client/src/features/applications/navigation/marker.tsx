import { Application, type MarkerProviderProps } from '@/features/application/application.tsx'
import styles from '@/features/applications/navigation/marker.module.scss'
import clsx from 'clsx'

interface Props extends Omit<MarkerProviderProps, 'children'> {}

export default function Marker(props: Props) {
  return (
    <Application.Marker
      {...props}
      className={clsx([styles.marker, props.size, props.direction, props.shape])}>
      navigation
    </Application.Marker>
  )
}
