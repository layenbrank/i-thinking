import { clsx } from 'clsx'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import { OVERLAY_RATIO } from '@/features/application/overlay-preset.ts'
import styles from '@/features/applications/navigation/overlay.module.scss'

// interface Props {}

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      {...OVERLAY_RATIO}
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <iframe
        // src="https://cn.bing.com"
        // src="https://www.baidu.com"
        src="https://www.xiaohongshu.com"
        referrerPolicy="unsafe-url"
        allow="accelerometer; autoplay; camera; clipboard-read; clipboard-write; encrypted-media; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; payment; picture-in-picture; publickey-credentials-get; screen-wake-lock; speaker-selection; usb; web-share; xr-spatial-tracking"
        allowFullScreen
        width="100%"
        height="100%"
        loading="eager"></iframe>
      {/* <div className={styles.overlay}>Overlay</div> */}
    </Application.Overlay>
  )
}
