import { convertFileSrc } from '@tauri-apps/api/core'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { useRef, useLayoutEffect } from 'react'

import { useOverlayDrag } from '@/hooks/use-overlay-drag'
import { useWheelScale } from '@/hooks/use-wheel-scale'
import { useThrough } from '@/hooks/use-through'
import { useOverlayStore, type OverlayTexture } from '@/stores/overlay'
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

  // ── 滚轮缩放（鼠标位置为中心） ──
  useWheelScale({
    rootRef,
    storeScale: item.scale,
    storeX: item.x,
    storeY: item.y,
    elWidth: item.w,
    elHeight: item.h,
    boundsWidth: stageBounds.width,
    boundsHeight: stageBounds.height,
    storeOpacity: item.opacity,
    onCommit: function (scale, x, y) {
      toUpdate(item.id, { scale, x, y })
    },
    onOpacityCommit: function (opacity) {
      toUpdate(item.id, { opacity })
    }
  })

  // ── 挂载时初始化 GSAP transform（仅一次，不干扰拖拽） ──
  useLayoutEffect(
    function () {
      const el = rootRef.current
      if (!el) return
      gsap.set(el, { x: item.x, y: item.y, scale: item.scale, opacity: item.opacity })
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  // ── store x/y/scale/opacity 外部变化时同步 GSAP ──
  const prevStoreRef = useRef({ x: item.x, y: item.y, scale: item.scale, opacity: item.opacity })
  useGSAP(
    function () {
      const el = rootRef.current
      if (!el) return
      const prev = prevStoreRef.current
      const changed =
        item.x !== prev.x ||
        item.y !== prev.y ||
        item.scale !== prev.scale ||
        item.opacity !== prev.opacity
      if (changed) {
        prevStoreRef.current = { x: item.x, y: item.y, scale: item.scale, opacity: item.opacity }
        gsap.set(el, { x: item.x, y: item.y, scale: item.scale, opacity: item.opacity })
      }
    },
    { scope: rootRef, dependencies: [item.x, item.y, item.scale, item.opacity] }
  )

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return
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
        zIndex: item.z
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={dragMove}
      onPointerUp={dragUp}
      onPointerCancel={dragCancel}
      onDoubleClick={toRemove.bind(null, item.id)}>
      <img
        className={styles.image}
        src={convertFileSrc(item.src)}
        alt="Screenshot texture"
        draggable={false}
      />
    </div>
  )
}

export default Texture
export { Texture }
