import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/calendar/overlay.module.scss'

const CalendarView = lazy(function () {
  return import('@/features/magnetic-tiles/calendar/calendar-view')
})

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx([styles.overlay, styles.root])}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <Suspense fallback={null}>
        <CalendarView
          embedded
          onClose={function () {
            onUpdateVisible(false)
          }}
        />
      </Suspense>
    </MagneticTile.Overlay>
  )
}
