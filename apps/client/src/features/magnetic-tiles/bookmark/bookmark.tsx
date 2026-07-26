import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/bookmark/bookmark.module.scss'
import clsx from 'clsx'
import type { MouseEvent } from 'react'

const Marker = lazy(function () {
  return import('@/features/magnetic-tiles/bookmark/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/magnetic-tiles/bookmark/overlay.tsx')
})

export default function Bookmark(props: SectionProps) {
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
      className={clsx(styles.bookmark)}>
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
