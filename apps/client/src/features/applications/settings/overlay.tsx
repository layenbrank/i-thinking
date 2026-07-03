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
      className={clsx([styles.overlay, styles.root])}
      style={{
        width: 'min(92vw, 960px)',
        maxHeight: 'min(90vh, 680px)',
        aspectRatio: 'unset',
        height: 'auto'
      }}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <Shell
        onClose={function () {
          onUpdateVisible(false)
        }}
      />
    </Application.Overlay>
  )
}
