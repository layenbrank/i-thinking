import { Icon } from '@iconify/react/offline'
import clsx from 'clsx'
import { Suspense, useMemo, useRef, type CSSProperties } from 'react'

import { ContextMenu, type MenuItem } from '@/components/contextmenu'
import { Fallback } from '@/components/fallback'
import { buildSurfaceStyle } from '@/features/magnetic-tile/surface-style'
import tileStyles from '@/features/magnetic-tile/magnetic-tile.module.scss'
import { LAYOUT_FALLBACK, type MarkerLayout } from '@/features/magnetic-tile/size'
import { useThrough } from '@/hooks/use-through'
import { useOverlayStore, type OverlayTile } from '@/stores/overlay'
import { renderMarker } from '@/views/overlay/markers'
import { removeOverlayTile, showMagneticTileOverlay } from '@/views/overlay/tauri'
import styles from '@/views/overlay/overlay.module.scss'

interface TileProps {
  item: OverlayTile
}

const DRAG_THRESHOLD = 6
const DOUBLE_CLICK_MS = 400

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

  const layout: MarkerLayout = {
    size: item.size ?? LAYOUT_FALLBACK.size,
    shape: item.shape ?? LAYOUT_FALLBACK.shape,
    direction: item.direction ?? LAYOUT_FALLBACK.direction
  }

  const surfaceStyle = useMemo(
    function () {
      return buildSurfaceStyle({
        round: item.round,
        background: item.background
      })
    },
    [item.round, item.background]
  )

  // 内联定位压过 magnetic-tile 的 position:relative；圆角由 mixin + CSS 变量负责
  const shellStyle = {
    position: 'absolute',
    left: item.x,
    top: item.y,
    width: item.w,
    height: item.h,
    zIndex: item.z,
    '--magnetic-tile-round': item.round ?? '12px'
  } as CSSProperties

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
    if (now - lastDownAtRef.current <= DOUBLE_CLICK_MS) {
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
        className={clsx(
          styles.tile,
          'magnetic-tile',
          tileStyles.magneticTile,
          tileStyles[`lv${layout.size}`],
          tileStyles[layout.shape],
          tileStyles[layout.direction]
        )}
        data-region="false"
        style={shellStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}>
        <div
          className={clsx('magnetic-tile-surface', tileStyles.surface)}
          style={surfaceStyle}>
          <Suspense fallback={<Fallback.Route />}>
            {renderMarker(item.kind, layout)}
          </Suspense>
        </div>
      </div>
    </ContextMenu>
  )
}

export default Tile
export { Tile }
