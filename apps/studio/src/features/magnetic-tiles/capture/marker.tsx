import { Icon } from '@iconify/react/offline'
import clsx from 'clsx'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/capture/marker.module.scss'

type Props = Pick<MagneticTile, 'title'> & Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  return (
    <MagneticTile.Marker
      size={props.size}
      direction={props.direction}
      shape={props.shape}
      className={clsx([styles.marker, styles[`lv${props.size}`]])}>
      <span
        className={styles.icon}
        aria-hidden="true">
        <Icon icon="lucide:camera" />
      </span>
      <span className={styles.name}>{props.title || '截屏'}</span>
    </MagneticTile.Marker>
  )
}
