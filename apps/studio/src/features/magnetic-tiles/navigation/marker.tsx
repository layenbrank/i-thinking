import { Avatar, AvatarFallback } from '@i-thinking/design/components/avatar'
import { clsx } from 'clsx'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/navigation/marker.module.scss'

type Props = Pick<MagneticTile, 'mark' | 'title'> & Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  const label = props.mark || [...props.title].at(0)
  return (
    <MagneticTile.Marker
      size={props.size}
      direction={props.direction}
      shape={props.shape}
      className={clsx([styles.marker, styles[`lv${props.size}`]])}>
      <Avatar className={clsx(styles.avatar, props.shape !== 'circle' && styles.square)}>
        <AvatarFallback className={styles.fallback}>{label}</AvatarFallback>
      </Avatar>
    </MagneticTile.Marker>
  )
}
