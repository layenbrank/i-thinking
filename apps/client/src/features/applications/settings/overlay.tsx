import { clsx } from 'clsx'
import { useContext } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import { OVERLAY_PANEL } from '@/features/application/overlay-preset.ts'
import Shell from '@/features/applications/settings/shell'
import styles from '@/features/applications/settings/overlay.module.scss'

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  function onClose() {
    onUpdateVisible(false)
  }

  return (
    <Application.Overlay
      {...OVERLAY_PANEL}
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      rootClassName={clsx(styles.overlay, styles.root)}
      onCancel={onClose}>
      <div className={styles.frame}>
        <Shell onClose={onClose} />
      </div>
    </Application.Overlay>
  )
}
