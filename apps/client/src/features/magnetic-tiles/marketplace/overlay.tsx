import { useCallback, useContext, useState } from 'react'

import { clsx } from 'clsx'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import {
  MarketplaceProvider,
  type MarketplaceMode
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import { Caption } from '@/features/magnetic-tiles/marketplace/workspace/caption'
import Workspace from '@/features/magnetic-tiles/marketplace/workspace/workspace'
import styles from '@/features/magnetic-tiles/marketplace/overlay.module.scss'

export default function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)
  const [mode, onUpdateModeState] = useState<MarketplaceMode>('booth')

  const onUpdateMode = useCallback(function (next: MarketplaceMode) {
    onUpdateModeState(next)
  }, [])

  return (
    <MarketplaceProvider
      mode={mode}
      onUpdateMode={onUpdateMode}>
      <MagneticTile.Overlay
        cache={props.cache}
        onAbort={props.onAbort}
        abortTimeoutMs={props.abortTimeoutMs}
        className={clsx(styles.overlay, styles.root)}
        caption={<Caption />}
        onCancel={function () {
          onUpdateVisible(false)
        }}>
        <Workspace />
      </MagneticTile.Overlay>
    </MarketplaceProvider>
  )
}
