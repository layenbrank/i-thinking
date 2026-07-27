import { Icon } from '@iconify/react'
import { Suspense, lazy, useRef, type ReactNode } from 'react'

import { ContextMenu, type MenuItem } from '@/components/contextmenu'
import { Fallback } from '@/components/fallback'
import { LAYOUT_FALLBACK } from '@/features/magnetic-tile/size'
import { useThrough } from '@/hooks/use-through'
import { useOverlayStore, type OverlayTileKind, type OverlayTile } from '@/stores/overlay'
import { removeOverlayTile, showMagneticTileOverlay } from '@/views/overlay/tauri'
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

interface TileProps {
  item: OverlayTile
}

interface MarkerHost {
  size: Mirror.Size
  shape: Mirror.Shape
  direction: Mirror.Direction
}

const TILE_MARKER_RENDERERS: Record<OverlayTileKind, (host: MarkerHost) => ReactNode> = {
  countdown(host) {
    return (
      <CountdownMarker
        size={host.size}
        shape={host.shape}
        direction={host.direction}
      />
    )
  },
  calendar(host) {
    return (
      <CalendarMarker
        size={host.size}
        shape={host.shape}
        direction={host.direction}
      />
    )
  },
  clock(host) {
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
const DBL_MS = 400

function Tile(props: TileProps) {
  const { item } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    originX: number
    originY: number
    x: number
    y: number
    moved: boolean
  } | null>(null)
  const lastDownAtRef = useRef(0)

  const updateItem = useOverlayStore(function (s) {
    return s.updateItem
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })

  useThrough(item.id, { rootRef, enabled: true })

  const size = item.size ?? LAYOUT_FALLBACK.size
  const shape = item.shape ?? LAYOUT_FALLBACK.shape
  const direction = item.direction ?? LAYOUT_FALLBACK.direction
  const RenderMarker = TILE_MARKER_RENDERERS[item.kind]

  const menuItems: MenuItem[] = [
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
      onSelect() {
        void removeOverlayTile(item.magneticTileID)
      }
    }
  ]

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return

    const now = Date.now()
    if (now - lastDownAtRef.current <= DBL_MS) {
      lastDownAtRef.current = 0
      dragRef.current = null
      void showMagneticTileOverlay(item.magneticTileID)
      return
    }
    lastDownAtRef.current = now

    dragRef.current = {
      pointerId: e.pointerId,
      originX: e.clientX,
      originY: e.clientY,
      x: item.x,
      y: item.y,
      moved: false
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    const dx = e.clientX - drag.originX
    const dy = e.clientY - drag.originY
    if (!drag.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
      drag.moved = true
      lastDownAtRef.current = 0
      bringToFront(item.id)
      e.currentTarget.setPointerCapture(e.pointerId)
    }
    if (!drag.moved) return
    updateItem(item.id, { x: drag.x + dx, y: drag.y + dy })
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    if (drag.moved) e.currentTarget.releasePointerCapture(e.pointerId)
  }

  function handlePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== e.pointerId) return
    dragRef.current = null
    lastDownAtRef.current = 0
  }

  return (
    <ContextMenu items={menuItems}>
      <div
        ref={rootRef}
        className={styles.tile}
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
        onPointerCancel={handlePointerCancel}>
        <div className={styles.tileInner}>
          <Suspense fallback={<Fallback.Route />}>
            {RenderMarker({ size, shape, direction })}
          </Suspense>
        </div>
      </div>
    </ContextMenu>
  )
}

export default Tile
export { Tile }
