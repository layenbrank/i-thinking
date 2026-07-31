import { Icon } from '@iconify/react/offline'
import { useRef } from 'react'

import { useThrough } from '@/hooks/use-through'
import { useOverlayStore, type OverlayTexture } from '@/stores/overlay'
import styles from '@/views/overlay/texture.module.scss'

interface TextureProps {
  item: OverlayTexture
}

function Texture(props: TextureProps) {
  const { item } = props
  const rootRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ originX: number; originY: number; x: number; y: number } | null>(null)

  const updateTexture = useOverlayStore(function (s) {
    return s.updateTexture
  })
  const removeItem = useOverlayStore(function (s) {
    return s.removeItem
  })
  const bringToFront = useOverlayStore(function (s) {
    return s.bringToFront
  })

  useThrough(item.id, { rootRef, enabled: !item.isThrough })

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    bringToFront(item.id)
    dragRef.current = {
      originX: e.clientX,
      originY: e.clientY,
      x: item.x,
      y: item.y
    }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    updateTexture(item.id, {
      x: drag.x + (e.clientX - drag.originX),
      y: drag.y + (e.clientY - drag.originY)
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
      const next = Math.min(1, Math.max(0.15, item.opacity + delta))
      updateTexture(item.id, { opacity: next })
      return
    }
    const scale = e.deltaY > 0 ? 0.92 : 1.08
    const w = Math.max(48, Math.round(item.w * scale))
    const h = Math.max(48, Math.round(item.h * scale))
    updateTexture(item.id, {
      w,
      h,
      x: item.x - (w - item.w) / 2,
      y: item.y - (h - item.h) / 2
    })
  }

  return (
    <div
      ref={rootRef}
      className={styles.texture}
      {...(item.isThrough ? {} : { 'data-region': 'false' })}
      style={{
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        zIndex: item.z,
        opacity: item.opacity
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}>
      <img
        className={styles.image}
        src={item.src}
        alt="Screenshot texture"
        draggable={false}
      />
      <div className={styles.chrome}>
        <button
          type="button"
          className={item.isThrough ? `${styles.btn} ${styles.active}` : styles.btn}
          aria-label={item.isThrough ? 'Disable click-through' : 'Enable click-through'}
          title="点击穿透"
          onClick={function () {
            updateTexture(item.id, { isThrough: !item.isThrough })
          }}>
          <Icon
            icon={item.isThrough ? 'mdi:cursor-default-click' : 'mdi:cursor-default-outline'}
            width={14}
          />
        </button>
        <button
          type="button"
          className={styles.btn}
          aria-label="Close texture"
          title="关闭"
          onClick={function () {
            removeItem(item.id)
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

export default Texture
export { Texture }
