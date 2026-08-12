import { Icon } from '@iconify/react/offline'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useRef, useLayoutEffect } from 'react'

import { useOverlayDrag } from '@/hooks/use-overlay-drag'
import { useWheelScale } from '@/hooks/use-wheel-scale'
import { useThrough } from '@/hooks/use-through'
import { useOverlayStore, type OverlayTexture } from '@/stores/overlay'
import { resolveTextureSrc } from '@/utils/tauri'
import { ResizeHandles } from '@/views/overlay/resize-handles'
import styles from '@/views/overlay/texture.module.scss'

interface TextureProps {
  item: OverlayTexture
  stageBounds: { width: number; height: number }
}

function Texture(props: TextureProps) {
  const { item, stageBounds } = props
  const rootRef = useRef<HTMLDivElement>(null)

  const toUpdate = useOverlayStore(function (s) {
    return s.toUpdate
  })
  const toRemove = useOverlayStore(function (s) {
    return s.toRemove
  })
  const toFront = useOverlayStore(function (s) {
    return s.toFront
  })

  useThrough(item.id, { rootRef, enabled: !item.isThrough })

  // ── 拖拽（GSAP transform + 惯性） ──
  const {
    handlePointerDown: dragDown,
    handlePointerMove: dragMove,
    handlePointerUp: dragUp,
    handlePointerCancel: dragCancel
  } = useOverlayDrag({
    rootRef,
    id: item.id,
    storeX: item.x,
    storeY: item.y,
    elWidth: item.w,
    elHeight: item.h,
    boundsWidth: stageBounds.width,
    boundsHeight: stageBounds.height,
    threshold: 0,
    onCommit: function (x, y) {
      toUpdate(item.id, { x, y })
    }
  })

  // ── 滚轮缩放 ──
  const handleWheel = useWheelScale({
    rootRef,
    storeScale: item.scale,
    storeOpacity: item.opacity,
    onCommit: function (scale) {
      toUpdate(item.id, { scale })
    },
    onOpacityCommit: function (opacity) {
      toUpdate(item.id, { opacity })
    }
  })

  // ── 四角缩放手柄 ──
  const resizeBaseRef = useRef({ w: item.w, h: item.h })
  resizeBaseRef.current = { w: item.w, h: item.h }

  function handleResizeStart() {
    toFront(item.id)
  }

  function handleResize(dw: number, dh: number) {
    const el = rootRef.current
    if (!el) return
    const newW = Math.max(48, resizeBaseRef.current.w + dw)
    const newH = Math.max(48, resizeBaseRef.current.h + dh)
    gsap.set(el, { width: newW, height: newH })
  }

  function handleResizeEnd() {
    const el = rootRef.current
    if (!el) return
    const finalW = Math.round(el.offsetWidth)
    const finalH = Math.round(el.offsetHeight)
    resizeBaseRef.current = { w: finalW, h: finalH }
    toUpdate(item.id, { w: finalW, h: finalH })
  }

  // ── 挂载时初始化 GSAP transform（仅一次，不干扰拖拽） ──
  useLayoutEffect(
    function () {
      const el = rootRef.current
      if (!el) return
      gsap.set(el, { x: item.x, y: item.y, scale: item.scale })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // ── store x/y/scale 外部变化时同步 GSAP ──
  const prevStoreRef = useRef({ x: item.x, y: item.y, scale: item.scale })
  useGSAP(
    function () {
      const el = rootRef.current
      if (!el) return
      const prev = prevStoreRef.current
      if (item.x !== prev.x || item.y !== prev.y || item.scale !== prev.scale) {
        prevStoreRef.current = { x: item.x, y: item.y, scale: item.scale }
        gsap.set(el, { x: item.x, y: item.y, scale: item.scale })
      }
    },
    { scope: rootRef, dependencies: [item.x, item.y, item.scale] }
  )

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    toFront(item.id)
    dragDown(e)
  }

  return (
    <div
      ref={rootRef}
      className={styles.texture}
      {...(item.isThrough ? {} : { 'data-region': 'false' })}
      style={{
        width: item.w,
        height: item.h,
        zIndex: item.z,
        opacity: item.opacity
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={dragMove}
      onPointerUp={dragUp}
      onPointerCancel={dragCancel}
      onWheel={handleWheel}>
      <img
        className={styles.image}
        src={resolveTextureSrc(item.src)}
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
            toUpdate(item.id, { isThrough: !item.isThrough })
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
            toRemove(item.id)
          }}>
          <Icon
            icon="mdi:close"
            width={14}
          />
        </button>
      </div>
      <ResizeHandles
        onResizeStart={handleResizeStart}
        onResize={handleResize}
        onResizeEnd={handleResizeEnd}
      />
    </div>
  )
}

export default Texture
export { Texture }
