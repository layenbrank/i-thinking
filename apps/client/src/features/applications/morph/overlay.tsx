import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/morph/overlay.module.scss'

const MorphWorkspace = lazy(function () {
  return import('@/features/applications/morph/workspace/morph')
})

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      caption={false}
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.workspace}>
        <Suspense fallback={null}>
          <MorphWorkspace />
        </Suspense>
      </div>
    </Application.Overlay>
  )
}
