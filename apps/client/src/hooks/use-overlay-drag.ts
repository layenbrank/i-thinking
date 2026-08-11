import gsap from 'gsap'
import { useCallback, useRef } from 'react'

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

/** 阻尼跟随系数：0→无跟随，1→即时跟随，0.35 提供弹性阻尼感 */
const DAMPING = 0.1

interface UseOverlayDragOptions {
  rootRef: React.RefObject<HTMLElement | null>
  id: string
  storeX: number
  storeY: number
  elWidth: number
  elHeight: number
  boundsWidth: number
  boundsHeight: number
  /** 超过该像素才算拖拽（tile 用 6，texture 用 0） */
  threshold?: number
  onCommit: (x: number, y: number) => void
  onDragStateChange?: (isDragging: boolean) => void
}

function useOverlayDrag(options: UseOverlayDragOptions) {
  const {
    rootRef,
    storeX,
    storeY,
    elWidth,
    elHeight,
    boundsWidth,
    boundsHeight,
    threshold = 0,
    onCommit,
    onDragStateChange
  } = options

  /** 用 ref 穿透闭包，确保稳定回调始终读到最新 props */
  const latestRef = useRef({
    storeX,
    storeY,
    elWidth,
    elHeight,
    boundsWidth,
    boundsHeight,
    threshold,
    onCommit,
    onDragStateChange
  })
  latestRef.current = {
    storeX,
    storeY,
    elWidth,
    elHeight,
    boundsWidth,
    boundsHeight,
    threshold,
    onCommit,
    onDragStateChange
  }

  /** 拖拽状态：origin=按下时指针位置，startX/Y=拖拽起始时元素坐标 */
  const dragRef = useRef<{
    pointerId: number
    originX: number
    originY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  /** 阻尼收尾目标（pointerUp 后独立追踪，不依赖 dragRef） */
  const dampingTargetRef = useRef<{ x: number; y: number } | null>(null)

  /** 停止阻尼跟随动画 */
  function stopDamping() {
    gsap.ticker.remove(dampingTick)
  }

  /** 阻尼跟随：每帧将元素位置向目标 lerp */
  function dampingTick() {
    const target = dampingTargetRef.current
    if (!target) {
      stopDamping()
      return
    }
    const el = rootRef.current
    if (!el) return

    const cx = Number(gsap.getProperty(el, 'x')) || 0
    const cy = Number(gsap.getProperty(el, 'y')) || 0
    const nx = cx + (target.x - cx) * DAMPING
    const ny = cy + (target.y - cy) * DAMPING

    if (Math.abs(target.x - nx) < 0.5 && Math.abs(target.y - ny) < 0.5) {
      gsap.set(el, { x: target.x, y: target.y })
      dampingTargetRef.current = null
      stopDamping()
      latestRef.current.onCommit(target.x, target.y)
      return
    }

    gsap.set(el, { x: nx, y: ny })

    if (Math.abs(target.x - nx) < 1 && Math.abs(target.y - ny) < 1) {
      gsap.set(el, { x: target.x, y: target.y })
      dampingTargetRef.current = null
      stopDamping()
      latestRef.current.onCommit(target.x, target.y)
    }
  }

  const handlePointerDown = useCallback(
    function (e: React.PointerEvent) {
      if (e.button !== 0) return
      const el = rootRef.current
      if (!el) return

      // 终止上一轮阻尼动画
      stopDamping()

      // 读元素实际渲染位置并 snap 冻结，防止残余阻尼帧造成偏移
      const actualX = Number(gsap.getProperty(el, 'x')) || 0
      const actualY = Number(gsap.getProperty(el, 'y')) || 0
      gsap.set(el, { x: actualX, y: actualY })
      dampingTargetRef.current = null
      dragRef.current = {
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        startX: actualX,
        startY: actualY,
        moved: false
      }
    },
    [rootRef]
  )

  const handlePointerMove = useCallback(
    function (e: React.PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const el = rootRef.current
      if (!el) return

      const {
        boundsWidth: bw,
        boundsHeight: bh,
        elWidth: ew,
        elHeight: eh,
        threshold: th,
        onDragStateChange: onDSC
      } = latestRef.current
      const mx = Math.max(0, bw - ew)
      const my = Math.max(0, bh - eh)

      const dx = e.clientX - drag.originX
      const dy = e.clientY - drag.originY

      if (!drag.moved && Math.hypot(dx, dy) >= th) {
        drag.moved = true
        onDSC?.(true)
        el.setPointerCapture(e.pointerId)
      }
      if (!drag.moved) return

      const rawX = drag.startX + dx
      const rawY = drag.startY + dy
      const tx = clamp(rawX, 0, mx)
      const ty = clamp(rawY, 0, my)
      dampingTargetRef.current = { x: tx, y: ty }

      gsap.ticker.add(dampingTick)
    },
    [rootRef]
  )

  const handlePointerUp = useCallback(
    function (e: React.PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const el = rootRef.current

      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }

      const { onDragStateChange: onDSC } = latestRef.current

      onDSC?.(false)

      if (!drag.moved || !el) {
        stopDamping()
        dampingTargetRef.current = null
        dragRef.current = null
        return
      }

      // 立即清空 dragRef，防止后续 pointerMove 误匹配旧 pointerId
      // 阻尼收尾由 dampingTargetRef 独立追踪
      const finalTarget = {
        x: Number(gsap.getProperty(el, 'x')) || 0,
        y: Number(gsap.getProperty(el, 'y')) || 0
      }
      dampingTargetRef.current = finalTarget
      dragRef.current = null
    },
    [rootRef]
  )

  const handlePointerCancel = useCallback(function () {
    const drag = dragRef.current
    if (!drag) return
    stopDamping()
    dampingTargetRef.current = null
    dragRef.current = null
    latestRef.current.onDragStateChange?.(false)
  }, [])

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel
  }
}

export { useOverlayDrag }
export type { UseOverlayDragOptions }
