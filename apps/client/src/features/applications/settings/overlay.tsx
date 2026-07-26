import { clsx } from 'clsx'
import { useContext } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import Shell from '@/features/applications/settings/shell'
import styles from '@/features/applications/settings/overlay.module.scss'

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      rootClassName={clsx(styles.overlay, styles.root)}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.frame}>
        <Shell />
      </div>
    </Application.Overlay>
  )
}
