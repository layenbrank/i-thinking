import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/gallery/overlay.module.scss'
import { clsx } from 'clsx'

// interface OverlayProps {}

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
