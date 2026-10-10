import clsx from 'clsx'
import { type MouseEvent } from 'react'

import { MagneticTile, type SectionProps } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/agent/agent.module.scss'

import Marker from '@/features/magnetic-tiles/agent/marker.tsx'

export default function Agent(props: SectionProps) {
  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }
  return (
    <MagneticTile.Section
      onTrash={onTrash}
      {...props}
      className={clsx(styles.agent)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
    </MagneticTile.Section>
  )
}
