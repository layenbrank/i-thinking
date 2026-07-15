import { Suspense, lazy, useRef } from 'react'

import { Fallback } from '@/components/fallback'
import { useThroughSource } from '@/hooks/use-through-source'
import { useOverlayStore, type OverlayPanelWidget } from '@/stores/overlay'
import styles from '@/views/overlay/overlay.module.scss'

const Countdown = lazy(function () {
  return import('@/views/countdown/countdown')
})
const Calendar = lazy(function () {
  return import('@/views/calendar/calendar')
})
const Clock = lazy(function () {
  return import('@/views/clock/clock')
})

interface PanelWidgetProps {
  widget: OverlayPanelWidget
}

export default function PanelWidget(props: PanelWidgetProps) {
  const { widget } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ ox: number; oy: number; x: number; y: number } | null>(null)

  const updateWidget = useOverlayStore(function (s) {
    return s.updateWidget
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })
  const removeWidget = useOverlayStore(function (s) {
    return s.removeWidget
  })

  useThroughSource(widget.id, rootRef, true)

  const INTERACTIVE =
    'button, a, input, textarea, select, [role="button"], .ant-select, .ant-picker, .ant-radio-group, .ant-checkbox-wrapper'

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    // Overlay in-layer drag handle uses data-region=false (avoids OS -webkit-app-region: drag).
    if (!target.closest('[data-region="false"]')) return
    if (target.closest(INTERACTIVE)) return
    bringToFront(widget.id)
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      x: widget.x,
      y: widget.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    updateWidget(widget.id, {
      x: drag.x + (e.clientX - drag.ox),
      y: drag.y + (e.clientY - drag.oy)
    })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      ref={rootRef}
      className={styles.panel}
      data-through="false"
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.w,
        height: widget.h,
        zIndex: widget.z
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}>
      <div className={styles.panelInner}>
        <Suspense fallback={<Fallback.Route />}>
          {widget.kind === 'countdown' && (
            <Countdown
              embedded
              onClose={function () {
                removeWidget(widget.id)
              }}
              onSizeChange={function (h) {
                updateWidget(widget.id, { h })
              }}
            />
          )}
          {widget.kind === 'calendar' && (
            <Calendar
              embedded
              onClose={function () {
                removeWidget(widget.id)
              }}
            />
          )}
          {widget.kind === 'clock' && (
            <Clock
              embedded
              onClose={function () {
                removeWidget(widget.id)
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  )
}
