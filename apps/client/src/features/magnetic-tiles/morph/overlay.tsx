import { clsx } from 'clsx'
import { Suspense, lazy, useContext } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import { Caption } from '@/features/magnetic-tiles/morph/workspace/caption'
import styles from '@/features/magnetic-tiles/morph/overlay.module.scss'
import { CSSVAR } from '@/themes'

const MorphWorkspace = lazy(function () {
  return import('@/features/magnetic-tiles/morph/workspace/workspace')
})

export default function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      caption={<Caption />}
      mode="fluid"
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx(styles.root, CSSVAR.KEY)}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <Suspense fallback={null}>
        <MorphWorkspace />
      </Suspense>
    </MagneticTile.Overlay>
  )
}
