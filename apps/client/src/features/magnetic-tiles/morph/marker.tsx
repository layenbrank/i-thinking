import clsx from 'clsx'

import { MagneticTile, type MarkerProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/morph/marker.module.scss'
import { CSSVAR } from '@/themes'

type Props = Omit<MarkerProps, 'children'>

export default function Marker(props: Props) {
  return (
    <MagneticTile.Marker
      {...props}
      className={clsx(styles.marker, CSSVAR.KEY, props.size, props.direction, props.shape)}>
      morph
    </MagneticTile.Marker>
  )
}
