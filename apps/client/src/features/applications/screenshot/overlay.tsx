import { clsx } from 'clsx'

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import { OVERLAY_RATIO } from '@/features/application/overlay-preset.ts'
import styles from '@/features/applications/screenshot/overlay.module.scss'

// interface Props {}

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      {...OVERLAY_RATIO}
      open={false}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </Application.Overlay>
  )
}
