import { clsx } from 'clsx'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/clipchamp/overlay.module.scss'
import {} from '@ffmpeg/ffmpeg'
import {} from '@ffmpeg/util'
import {} from 'mp4box'

// interface Props {}

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
