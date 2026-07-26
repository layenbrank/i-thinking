import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/code/overlay.module.scss'

const CodeWorkspace = lazy(function () {
  return import('@/features/applications/code/workspace/code')
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
          <CodeWorkspace />
        </Suspense>
      </div>
    </Application.Overlay>
  )
}
