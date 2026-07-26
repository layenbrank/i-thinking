import { Suspense, lazy, useRef, type ReactNode } from 'react'

import { Fallback } from '@/components/fallback'
import { LAYOUT_FALLBACK } from '@/features/application/size'
import { useThroughSource } from '@/hooks/use-through-source'
import {
  useOverlayStore,
  type OverlayPanelKind,
  type OverlayPanelWidget
} from '@/stores/overlay'
import { openApplicationOverlay } from '@/views/overlay/tauri'
import styles from '@/views/overlay/overlay.module.scss'

const CountdownMarker = lazy(function () {
  return import('@/features/applications/countdown/marker')
})
const CalendarMarker = lazy(function () {
  return import('@/features/applications/calendar/marker')
})
const ClockMarker = lazy(function () {
  return import('@/features/applications/clock/marker')
})

interface PanelWidgetProps {
  widget: OverlayPanelWidget
}

interface MarkerHost {
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

const PANEL_MARKER_RENDERERS: Record<OverlayPanelKind, (host: MarkerHost) => ReactNode> = {
  countdown: function renderCountdown(host) {
    return (
      <CountdownMarker
        size={host.size}
        shape={host.shape}
        direction={host.direction}
      />
    )
  },
  calendar: function renderCalendar(host) {
    return (
      <CalendarMarker
        size={host.size}
        shape={host.shape}
        direction={host.direction}
      />
    )
  },
  clock: function renderClock(host) {
    return (
      <ClockMarker
        size={host.size}
        shape={host.shape}
        direction={host.direction}
      />
    )
  }
}

const DRAG_THRESHOLD = 6

export default function PanelWidget(props: PanelWidgetProps) {
  const { widget } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    ox: number
    oy: number
    x: number
    y: number
    moved: boolean
  } | null>(null)

  const updateWidget = useOverlayStore(function (s) {
    return s.updateWidget
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })

  useThroughSource(widget.id, rootRef, true)

  const size = widget.size ?? LAYOUT_FALLBACK.size
  const shape = widget.shape ?? LAYOUT_FALLBACK.shape
  const direction = widget.direction ?? LAYOUT_FALLBACK.direction
  const renderMarker = PANEL_MARKER_RENDERERS[widget.kind]

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    bringToFront(widget.id)
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      x: widget.x,
      y: widget.y,
      moved: false
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.ox
    const dy = e.clientY - drag.oy
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      drag.moved = true
    }
    if (!drag.moved) return
    updateWidget(widget.id, {
      x: drag.x + dx,
      y: drag.y + dy
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

  function handleDoubleClick() {
    const drag = dragRef.current
    if (drag?.moved) return
    if (!widget.applicationId) return
    void openApplicationOverlay(widget.applicationId)
  }

  return (
    <div
      ref={rootRef}
      className={styles.panel}
      data-through="false"
      data-region="false"
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.w,
        height: widget.h,
        zIndex: widget.z
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}>
      <div className={styles.panelInner}>
        <Suspense fallback={<Fallback.Route />}>
          {renderMarker({ size, shape, direction })}
        </Suspense>
      </div>
    </div>
  )
}
