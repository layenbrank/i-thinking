import clsx from 'clsx'
import { Zap } from 'lucide-react'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/directive/marker.module.scss'

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
        <Zap />
      </span>
      <span className={styles.name}>{props.title}</span>
    </MagneticTile.Marker>
  )
}
