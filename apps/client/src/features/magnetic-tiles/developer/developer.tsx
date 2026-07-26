import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/developer/developer.module.scss'

const Marker = lazy(function () {
  return import('@/features/magnetic-tiles/developer/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/magnetic-tiles/developer/overlay.tsx')
})

export default function Developer(props: SectionProps) {
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
      className={clsx(styles.developer)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      {isRenderOverlay ? (
        <Suspense fallback={null}>
          <Overlay
            cache={cache}
            onAbort={props.onAbort}
            abortTimeoutMs={props.abortTimeoutMs}
          />
        </Suspense>
      ) : null}
    </MagneticTile.Section>
  )
}
