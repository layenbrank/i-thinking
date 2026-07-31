import { Suspense, lazy, useContext } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/calendar/overlay.module.scss'

const CalendarView = lazy(function () {
  return import('@/features/magnetic-tiles/calendar/calendar-view')
})

function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      caption={true}
      width="88%"
      style={{
        minWidth: 860,
        aspectRatio: '16 / 10'
      }}
      className={styles.root}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.stage}>
        <Suspense fallback={<div className={styles.fallback}>加载中…</div>}>
          <CalendarView
            embedded
            onClose={function () {
              onUpdateVisible(false)
            }}
          />
        </Suspense>
      </div>
    </MagneticTile.Overlay>
  )
}

export default Overlay
