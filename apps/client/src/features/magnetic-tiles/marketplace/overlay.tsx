import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/marketplace/overlay.module.scss'

const Workspace = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/workspace')
})

export default function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx(styles.overlay, styles.root)}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <Suspense fallback={null}>
        <Workspace />
      </Suspense>
    </MagneticTile.Overlay>
  )
}
