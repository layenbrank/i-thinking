import { Icon } from '@iconify/react'
import { Suspense, lazy, useRef, type ReactNode } from 'react'

import { ContextMenu, type ContextMenuItem } from '@/components/contextmenu'
import { Fallback } from '@/components/fallback'
import { LAYOUT_FALLBACK } from '@/features/magnetic-tile/size'
import { useThroughSource } from '@/hooks/use-through-source'
import {
  useOverlayStore,
  type OverlayPanelKind,
  type OverlayPanel
} from '@/stores/overlay'
import { showMagneticTileOverlay } from '@/views/overlay/tauri'
import styles from '@/views/overlay/overlay.module.scss'

const CountdownMarker = lazy(function () {
  return import('@/features/magnetic-tiles/countdown/marker')
})
const CalendarMarker = lazy(function () {
  return import('@/features/magnetic-tiles/calendar/marker')
})
const ClockMarker = lazy(function () {
  return import('@/features/magnetic-tiles/clock/marker')
})

interface PanelProps {
  item: OverlayPanel
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

function Panel(props: PanelProps) {
  const { item } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    originX: number
    originY: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const movedRef = useRef(false)

  const updateItem = useOverlayStore(function (s) {
    return s.updateItem
  })
  const removeItem = useOverlayStore(function (s) {
    return s.removeItem
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })

  useThroughSource(item.id, rootRef, true)

  const size = item.size ?? LAYOUT_FALLBACK.size
  const shape = item.shape ?? LAYOUT_FALLBACK.shape
  const direction = item.direction ?? LAYOUT_FALLBACK.direction
  const renderMarker = PANEL_MARKER_RENDERERS[item.kind]

  const menuItems: ContextMenuItem[] = [
    {
      key: 'float-unmount',
      label: '移除',
      icon: (
        <Icon
          icon="ant-design:minus-outlined"
          width={14}
          height={14}
        />
      ),
      onClick: function () {
        removeItem(item.id)
      }
    }
  ]

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    bringToFront(item.id)
    movedRef.current = false
    dragRef.current = {
      originX: e.clientX,
      originY: e.clientY,
      x: item.x,
      y: item.y,
      moved: false
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = e.clientX - drag.originX
    const dy = e.clientY - drag.originY
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      drag.moved = true
      movedRef.current = true
    }
    if (!drag.moved) return
    updateItem(item.id, {
      x: drag.x + dx,
      y: drag.y + dy
    })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    if (dragRef.current.moved) movedRef.current = true
    dragRef.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  function handleDoubleClick() {
    if (movedRef.current) {
      movedRef.current = false
      return
    }
    if (!item.magneticTileID) return
    void showMagneticTileOverlay(item.magneticTileID)
  }

  return (
    <ContextMenu items={menuItems}>
      <div
        ref={rootRef}
        className={styles.panel}
        data-through="false"
        data-region="false"
        style={{
          left: item.x,
          top: item.y,
          width: item.w,
          height: item.h,
          zIndex: item.z
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
    </ContextMenu>
  )
}

export default Panel
export { Panel }
