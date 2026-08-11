import gsap from 'gsap'
import { InertiaPlugin } from 'gsap/InertiaPlugin'
import { useCallback, useRef } from 'react'

gsap.registerPlugin(InertiaPlugin)

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

interface VelocitySample {
  x: number
  y: number
  t: number
}

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
  /** 释放时启用惯性滑行 */
  enableInertia?: boolean
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
    enableInertia = false,
    onCommit,
    onDragStateChange
  } = options

  /** 用 ref 穿透闭包，确保稳定回调始终读到最新 props */
  const latestRef = useRef({ storeX, storeY, elWidth, elHeight, boundsWidth, boundsHeight, threshold, enableInertia, onCommit, onDragStateChange })
  latestRef.current = { storeX, storeY, elWidth, elHeight, boundsWidth, boundsHeight, threshold, enableInertia, onCommit, onDragStateChange }

  /** 拖拽状态：origin=按下时指针位置，startX/Y=拖拽起始时元素坐标 */
  const dragRef = useRef<{
    pointerId: number
    originX: number
    originY: number
    startX: number
    startY: number
    moved: boolean
  } | null>(null)

  /** 最近 3 帧速度采样 */
  const velocityRef = useRef<VelocitySample[]>([])

  /** 惯性动画 tween（用于 killTweensOf 竞争处理） */
  const inertiaTweenRef = useRef<gsap.core.Tween | null>(null)

  function addSample(x: number, y: number) {
    const samples = velocityRef.current
    samples.push({ x, y, t: performance.now() })
    if (samples.length > 4) samples.shift()
  }

  function getVelocity(): { vx: number; vy: number } {
    const samples = velocityRef.current
    if (samples.length < 2) return { vx: 0, vy: 0 }
    const first = samples[0]
    const last = samples[samples.length - 1]
    const dt = (last.t - first.t) / 1000
    if (dt <= 0) return { vx: 0, vy: 0 }
    return {
      vx: (last.x - first.x) / dt,
      vy: (last.y - first.y) / dt
    }
  }

  const handlePointerDown = useCallback(
    function (e: React.PointerEvent) {
      if (e.button !== 0) return
      const el = rootRef.current
      if (!el) return

      // 终止可能正在运行的惯性动画
      if (inertiaTweenRef.current) {
        inertiaTweenRef.current.kill()
        inertiaTweenRef.current = null
      }

      const { storeX: sx, storeY: sy } = latestRef.current
      dragRef.current = {
        pointerId: e.pointerId,
        originX: e.clientX,
        originY: e.clientY,
        startX: sx,
        startY: sy,
        moved: false
      }
      velocityRef.current = []
      addSample(dragRef.current.startX, dragRef.current.startY)
    },
    [rootRef]
  )

  const handlePointerMove = useCallback(
    function (e: React.PointerEvent) {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== e.pointerId) return
      const el = rootRef.current
      if (!el) return

      const { boundsWidth: bw, boundsHeight: bh, elWidth: ew, elHeight: eh, threshold: th, onDragStateChange: onDSC } = latestRef.current
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
      const x = clamp(rawX, 0, mx)
      const y = clamp(rawY, 0, my)

      addSample(x, y)
      gsap.set(el, { x, y })
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

      const { enableInertia: useInertia, onCommit: commit, onDragStateChange: onDSC } = latestRef.current
      const maxXC = Math.max(0, latestRef.current.boundsWidth - latestRef.current.elWidth)
      const maxYC = Math.max(0, latestRef.current.boundsHeight - latestRef.current.elHeight)

      onDSC?.(false)

      if (!drag.moved || !el) {
        dragRef.current = null
        return
      }

      const currentX = Number(gsap.getProperty(el, 'x')) || 0
      const currentY = Number(gsap.getProperty(el, 'y')) || 0

      if (useInertia && !prefersReducedMotion()) {
        const { vx, vy } = getVelocity()
        const speed = Math.hypot(vx, vy)

        if (speed > 50) {
          inertiaTweenRef.current = gsap.to(el, {
            inertia: {
              x: { velocity: vx, resistance: 300, minVelocity: 20 },
              y: { velocity: vy, resistance: 300, minVelocity: 20 }
            },
            onComplete() {
              const finalX = Number(gsap.getProperty(el, 'x')) || 0
              const finalY = Number(gsap.getProperty(el, 'y')) || 0
              const clampedX = clamp(finalX, 0, maxXC)
              const clampedY = clamp(finalY, 0, maxYC)
              inertiaTweenRef.current = null
              commit(clampedX, clampedY)
            }
          })
          dragRef.current = null
          return
        }
      }

      dragRef.current = null
      commit(currentX, currentY)
    },
    [rootRef]
  )

  const handlePointerCancel = useCallback(
    function () {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      latestRef.current.onDragStateChange?.(false)
    },
    []
  )

  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handlePointerCancel
  }
}

export { useOverlayDrag }
export type { UseOverlayDragOptions }
