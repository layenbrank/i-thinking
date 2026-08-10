import clsx from 'clsx'
import { useContext, type MouseEvent } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/clock/clock.module.scss'

import Marker from '@/features/magnetic-tiles/clock/marker.tsx'
import Overlay from '@/features/magnetic-tiles/clock/overlay.tsx'

export default function Clock(props: SectionProps) {
  const { renderable } = useContext(OverlayContext)
  const cache = props.cache ?? 'destroy'
  const isRenderOverlay = renderable

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
      {isRenderOverlay ? (
        <Overlay
          cache={cache}
          onAbort={props.onAbort}
          abortTimeoutMs={props.abortTimeoutMs}
        />
      ) : null}
    </MagneticTile.Section>
  )
}
