import clsx from 'clsx'
import { useContext, type MouseEvent } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/example/example.module.scss'

import Marker from '@/features/magnetic-tiles/example/marker.tsx'
import Overlay from '@/features/magnetic-tiles/example/overlay.tsx'

export default function Example(props: SectionProps) {
  const { renderable } = useContext(OverlayContext)
  const cache = props.cache ?? 'destroy'
  const isRenderOverlay = renderable

  function onTrash(e: MouseEvent<HTMLElement>) {
    console.log('Trash clicked for', e)
  }

  return (
    <MagneticTile.Section
      {...props}
      onTrash={onTrash}
      className={clsx(styles.example)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
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
