import clsx from 'clsx'
import { type MouseEvent } from 'react'

import { MagneticTile, type SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/clock/clock.module.scss'

import Marker from '@/features/magnetic-tiles/clock/marker.tsx'

export default function Clock(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <MagneticTile.Section
      onTrash={onTrash}
      {...props}
      className={clsx(styles.clock)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
    </MagneticTile.Section>
  )
}
