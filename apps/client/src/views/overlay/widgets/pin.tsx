import { Icon } from '@iconify/react'
import { useRef } from 'react'

import { useThroughSource } from '@/hooks/use-through-source'
import { useOverlayStore, type OverlayPinWidget } from '@/stores/overlay'
import styles from '@/views/overlay/widgets/pin.module.scss'

interface PinWidgetProps {
  widget: OverlayPinWidget
}

export default function PinWidget(props: PinWidgetProps) {
  const { widget } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ ox: number; oy: number; x: number; y: number } | null>(null)

  const updatePin = useOverlayStore(function (s) {
    return s.updatePin
  })
  const removeWidget = useOverlayStore(function (s) {
    return s.removeWidget
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })

  useThroughSource(widget.id, rootRef, !widget.isThrough)

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    bringToFront(widget.id)
    dragRef.current = {
      ox: e.clientX,
      oy: e.clientY,
      x: widget.x,
      y: widget.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    updatePin(widget.id, {
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
      /* already released */
    }
  }

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (e.ctrlKey) {
      const delta = e.deltaY > 0 ? -0.05 : 0.05
      const next = Math.min(1, Math.max(0.15, widget.opacity + delta))
      updatePin(widget.id, { opacity: next })
      return
    }
    const scale = e.deltaY > 0 ? 0.92 : 1.08
    const w = Math.max(48, Math.round(widget.w * scale))
    const h = Math.max(48, Math.round(widget.h * scale))
    updatePin(widget.id, {
      w,
      h,
      x: widget.x - (w - widget.w) / 2,
      y: widget.y - (h - widget.h) / 2
    })
  }

  return (
    <div
      ref={rootRef}
      className={styles.pin}
      data-through="false"
      style={{
        left: widget.x,
        top: widget.y,
        width: widget.w,
        height: widget.h,
        zIndex: widget.z,
        opacity: widget.opacity
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}>
      <img
        className={styles.image}
        src={widget.src}
        alt="Pinned screenshot"
        draggable={false}
      />
      <div className={styles.chrome}>
        <button
          type="button"
          className={widget.isThrough ? `${styles.btn} ${styles.active}` : styles.btn}
          aria-label={widget.isThrough ? 'Disable click-through' : 'Enable click-through'}
          title="点击穿透"
          onClick={function () {
            updatePin(widget.id, { isThrough: !widget.isThrough })
          }}>
          <Icon
            icon={widget.isThrough ? 'mdi:cursor-default-click' : 'mdi:cursor-default-outline'}
            width={14}
          />
        </button>
        <button
          type="button"
          className={styles.btn}
          aria-label="Close pin"
          title="关闭"
          onClick={function () {
            removeWidget(widget.id)
          }}>
          <Icon
            icon="mdi:close"
            width={14}
          />
        </button>
      </div>
    </div>
  )
}
