import { clsx } from 'clsx'
import { Suspense, lazy, useContext, useEffect } from 'react'

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
  const { visible, onUpdateVisible, onUpdateFullscreen } = useContext(OverlayContext)

  // morph 打开即全屏，且不提供退出全屏入口
  useEffect(
    function () {
      if (visible) onUpdateFullscreen(true)
    },
    [visible, onUpdateFullscreen]
  )

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
