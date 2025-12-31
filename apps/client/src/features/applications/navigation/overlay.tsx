import { clsx } from 'clsx'

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/navigation/overlay.module.scss'

// interface Props {}

export default function Overlay() {
  const { onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      open={false}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
      <iframe
        // src="https://cn.bing.com"
        src="https://www.baidu.com"
        allow="autoplay; encrypted-media"
        allowFullScreen
        width="100%"
        height="100%"
        seamless={true}></iframe>
      {/* <div className={styles.overlay}>Overlay</div> */}
    </Application.Overlay>
  )
}
