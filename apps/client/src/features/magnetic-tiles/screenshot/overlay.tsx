import { clsx } from 'clsx'

import { MagneticTile, OverlayContext } from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/screenshot/overlay.module.scss'

// interface Props {}

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </MagneticTile.Overlay>
  )
}
