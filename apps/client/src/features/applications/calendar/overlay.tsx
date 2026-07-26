import { clsx } from 'clsx'
import { Suspense, lazy } from 'react'

import {
  Application,
  OverlayContext,
  type OverlayControlProps
} from '@/features/application/application.tsx'
import styles from '@/features/applications/calendar/overlay.module.scss'

const CalendarView = lazy(function () {
  return import('@/features/applications/calendar/calendar-view')
})

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)

  return (
    <Application.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      open={visible}
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
    </Application.Overlay>
  )
}
