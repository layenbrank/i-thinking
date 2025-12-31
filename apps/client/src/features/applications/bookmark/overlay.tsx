import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/bookmark/overlay.module.scss'

// interface Props {}

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      open={visible}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </Application.Overlay>
  )
}
