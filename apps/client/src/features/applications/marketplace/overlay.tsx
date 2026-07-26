import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/marketplace/overlay.module.scss'

const MarketplaceWorkspace = lazy(function () {
  return import('@/features/applications/marketplace/workspace/marketplace')
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
          <MarketplaceWorkspace />
        </Suspense>
      </div>
    </Application.Overlay>
  )
}
