import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/gallery/overlay.module.scss'
import { clsx } from 'clsx'

// interface OverlayProps {}

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <div className={styles.overlay}>Overlay</div>
    </Application.Overlay>
  )
}
