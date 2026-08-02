/**
 * Overview 胶囊：容器内拖拽 + 始终贴左右边
 *
 * 状态机：collapsed | expanded | dragging
 * - tip：仅 hover 展开（无点击）
 * - expanded 且仍记着 edge：指针离开约 IDLE 后缩回该边
 * - 拖拽松手：按水平中心判断更近侧，吸附收缩（不允许停在中间）
 */
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'

import {
  readCapsulePlacement,
  writeCapsulePlacement,
  type CapsuleEdge
} from '@/views/overview/lib/capsule-placement'

gsap.registerPlugin(Draggable)

const MARGIN_PX = 8
const SETTLE_DURATION = 0.28
const EXPAND_DURATION = 0.22
const HOVER_EXPAND_MS = 120
const IDLE_COLLAPSE_MS = 1000
const SETTLE_EASE = 'power3.out'

type CapsuleMode = 'collapsed' | 'expanded' | 'dragging'

type CapsuleDrag = {
  destroy(): void
}

type CapsuleDragOptions = {
  reducedMotion?: boolean
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function bindCapsuleDrag(
  el: HTMLElement,
  bounds: HTMLElement,
  options?: CapsuleDragOptions
): CapsuleDrag {
  const isReducedMotion = options?.reducedMotion ?? prefersReducedMotion()
  const duration = isReducedMotion ? 0 : SETTLE_DURATION
  const expandDuration = isReducedMotion ? 0 : EXPAND_DURATION

  let mode: CapsuleMode = 'collapsed'
  /** collapsed：当前贴边；expanded：idle 可缩回的边；dragging：null */
  let edge: CapsuleEdge | null = null
  let isAnimating = false
  let hasDragMoved = false
  let hoverTimer = 0
  let idleTimer = 0

  function findMetrics() {
    return {
      width: el.offsetWidth,
      height: el.offsetHeight,
      boundsWidth: bounds.clientWidth,
      boundsHeight: bounds.clientHeight
    }
  }

  function findCollapsedX(side: CapsuleEdge, width: number, boundsWidth: number) {
    if (side === 'left') return 0
    return Math.max(0, boundsWidth - width)
  }

  function findExpandedX(side: CapsuleEdge, width: number, boundsWidth: number) {
    if (side === 'left') return MARGIN_PX
    return boundsWidth - width - MARGIN_PX
  }

  function findCurrentY() {
    return Number(gsap.getProperty(el, 'y')) || 0
  }

  function findCurrentX() {
    return Number(gsap.getProperty(el, 'x')) || 0
  }

  /** 按胶囊水平中心判断更近的侧边 */
  function findNearerSide(x: number, width: number, boundsWidth: number): CapsuleEdge {
    const centerX = x + width / 2
    return centerX < boundsWidth / 2 ? 'left' : 'right'
  }

  function applyMode(next: CapsuleMode, nextEdge: CapsuleEdge | null) {
    mode = next
    edge = nextEdge

    if (mode === 'collapsed' && edge) {
      el.dataset.collapsed = 'true'
      el.dataset.edge = edge
      el.setAttribute('aria-expanded', 'false')
      return
    }

    delete el.dataset.collapsed
    delete el.dataset.edge
    el.setAttribute('aria-expanded', 'true')
  }

  function clearHoverTimer() {
    if (!hoverTimer) return
    window.clearTimeout(hoverTimer)
    hoverTimer = 0
  }

  function clearIdleTimer() {
    if (!idleTimer) return
    window.clearTimeout(idleTimer)
    idleTimer = 0
  }

  function clearTimers() {
    clearHoverTimer()
    clearIdleTimer()
  }

  function afterLayout(task: () => void) {
    requestAnimationFrame(task)
  }

  function persist() {
    if (!edge) return

    const { height, boundsHeight } = findMetrics()
    if (!boundsHeight || !height) return

    const maxY = Math.max(1, boundsHeight - height)
    writeCapsulePlacement({
      yRatio: clamp(findCurrentY() / maxY, 0, 1),
      edge
    })
  }

  function animateTo(x: number, y: number, animDuration: number, onDone?: () => void) {
    isAnimating = true
    gsap.to(el, {
      x,
      y,
      duration: animDuration,
      ease: SETTLE_EASE,
      overwrite: true,
      onComplete() {
        isAnimating = false
        onDone?.()
      }
    })
  }

  function collapse(side: CapsuleEdge, animDuration: number) {
    clearTimers()
    gsap.killTweensOf(el)
    applyMode('collapsed', side)

    afterLayout(function () {
      const { width, height, boundsWidth, boundsHeight } = findMetrics()
      const endX = findCollapsedX(side, width, boundsWidth)
      const endY = clamp(findCurrentY(), 0, Math.max(0, boundsHeight - height))

      if (animDuration <= 0) {
        gsap.set(el, { x: endX, y: endY })
        persist()
        return
      }

      animateTo(endX, endY, animDuration, persist)
    })
  }

  function expand() {
    if (mode !== 'collapsed' || !edge) return

    const side = edge
    clearTimers()
    gsap.killTweensOf(el)
    applyMode('expanded', side)

    afterLayout(function () {
      const { width, height, boundsWidth, boundsHeight } = findMetrics()
      animateTo(
        findExpandedX(side, width, boundsWidth),
        clamp(
          findCurrentY(),
          MARGIN_PX,
          Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)
        ),
        expandDuration,
        function () {
          persist()
          armIdleCollapse()
        }
      )
    })
  }

  function armIdleCollapse() {
    clearIdleTimer()
    if (mode !== 'expanded' || !edge) return
    if (el.matches(':hover')) return

    const side = edge
    idleTimer = window.setTimeout(
      function () {
        idleTimer = 0
        if (mode !== 'expanded' || edge !== side) return
        if (el.matches(':hover')) return
        collapse(side, duration)
      },
      isReducedMotion ? 0 : IDLE_COLLAPSE_MS
    )
  }

  /** 松手：始终吸附更近侧边，不允许停在中间 */
  function settle() {
    clearTimers()
    gsap.killTweensOf(el)

    const { width, boundsWidth } = findMetrics()
    const side = findNearerSide(findCurrentX(), width, boundsWidth)
    collapse(side, duration)
  }

  function placeFromStorage() {
    const placement = readCapsulePlacement()
    const { width, boundsWidth } = findMetrics()
    if (!width || !boundsWidth) return

    clearTimers()
    gsap.set(el, { left: 0, top: 0 })
    applyMode('collapsed', placement.edge)

    afterLayout(function () {
      const metrics = findMetrics()
      gsap.set(el, {
        x: findCollapsedX(placement.edge, metrics.width, metrics.boundsWidth),
        y: clamp(
          placement.yRatio * Math.max(0, metrics.boundsHeight - metrics.height),
          0,
          Math.max(0, metrics.boundsHeight - metrics.height)
        )
      })
    })
  }

  function beginDrag() {
    clearTimers()
    gsap.killTweensOf(el)
    isAnimating = false
    applyMode('dragging', null)
  }

  const [draggable] = Draggable.create(el, {
    type: 'x,y',
    bounds,
    edgeResistance: 0.75,
    inertia: false,
    dragClickables: true,
    zIndexBoost: false,
    minimumMovement: 4,
    cursor: 'grab',
    activeCursor: 'grabbing',
    onPress() {
      hasDragMoved = false
      clearHoverTimer()
    },
    onDragStart() {
      hasDragMoved = true
      beginDrag()
    },
    onDragEnd() {
      if (!hasDragMoved) return
      settle()
    }
  })

  function onPointerEnter() {
    if (mode === 'collapsed') {
      if (draggable.isDragging || draggable.isPressed) return
      clearHoverTimer()
      hoverTimer = window.setTimeout(
        function () {
          hoverTimer = 0
          if (mode !== 'collapsed') return
          if (draggable.isDragging || draggable.isPressed) return
          expand()
        },
        isReducedMotion ? 0 : HOVER_EXPAND_MS
      )
      return
    }

    if (mode === 'expanded') clearIdleTimer()
  }

  function onPointerLeave() {
    clearHoverTimer()
    if (mode === 'expanded') armIdleCollapse()
  }

  function onResize() {
    if (!draggable) return
    draggable.applyBounds(bounds)
    if (isAnimating || mode === 'dragging') return

    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    if (!width || !boundsWidth) return

    if (mode === 'collapsed' && edge) {
      gsap.set(el, {
        x: findCollapsedX(edge, width, boundsWidth),
        y: clamp(findCurrentY(), 0, Math.max(0, boundsHeight - height))
      })
      return
    }

    // 展开态：贴着归属边保持 MARGIN
    if (mode === 'expanded' && edge) {
      gsap.set(el, {
        x: findExpandedX(edge, width, boundsWidth),
        y: clamp(
          findCurrentY(),
          MARGIN_PX,
          Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)
        )
      })
    }
  }

  placeFromStorage()
  afterLayout(function () {
    placeFromStorage()
    draggable.applyBounds(bounds)
  })

  el.addEventListener('pointerenter', onPointerEnter)
  el.addEventListener('pointerleave', onPointerLeave)

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(bounds)

  return {
    destroy() {
      clearTimers()
      el.removeEventListener('pointerenter', onPointerEnter)
      el.removeEventListener('pointerleave', onPointerLeave)
      resizeObserver.disconnect()
      gsap.killTweensOf(el)
      draggable?.kill()
    }
  }
}

export { bindCapsuleDrag }
export type { CapsuleDrag, CapsuleDragOptions }
