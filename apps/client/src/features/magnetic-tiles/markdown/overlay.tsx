import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/markdown/overlay.module.scss'

const MarkdownWorkspace = lazy(function () {
  return import('@/features/magnetic-tiles/markdown/workspace/markdown')
})

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      caption={false}
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx([styles.overlay, styles.root])}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.workspace}>
        <Suspense fallback={null}>
          <MarkdownWorkspace />
        </Suspense>
      </div>
    </MagneticTile.Overlay>
  )
}
