import { clsx } from 'clsx'
import { useContext } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import Shell from '@/features/magnetic-tiles/settings/shell'
import styles from '@/features/magnetic-tiles/settings/overlay.module.scss'

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx(styles.overlay, styles.root)}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.frame}>
        <Shell />
      </div>
    </MagneticTile.Overlay>
  )
}
