import { clsx } from 'clsx'

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/settings/overlay.module.scss'

// interface Props {}

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </Application.Overlay>
  )
}
