import { Suspense, lazy, useContext, type MouseEvent } from 'react'

import clsx from 'clsx'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import { OverlaySkeleton } from '@/features/magnetic-tiles/marketplace/workspace/skeleton'
import styles from '@/features/magnetic-tiles/marketplace/marketplace.module.scss'

const Marker = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/overlay.tsx')
})

export default function Marketplace(props: SectionProps) {
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
      className={clsx(styles.marketplace)}>
      <Marker
        size={props.size}
        direction={props.direction}
        shape={props.shape}
      />
      {isRenderOverlay ? (
        <Suspense fallback={<OverlaySkeleton />}>
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
