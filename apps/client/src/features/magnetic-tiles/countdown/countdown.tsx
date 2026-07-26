import clsx from 'clsx'
import type { MouseEvent } from 'react'
import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type SectionProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/countdown/countdown.module.scss'

const Marker = lazy(function () {
  return import('@/features/magnetic-tiles/countdown/marker.tsx')
})
const Overlay = lazy(function () {
  return import('@/features/magnetic-tiles/countdown/overlay.tsx')
})

export default function Countdown(props: SectionProps) {
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
      className={clsx(styles.countdown)}>
      <Marker
        size={props.size}
        shape={props.shape}
        direction={props.direction}
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
