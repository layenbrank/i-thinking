/**
 * Overview 胶囊：容器内拖拽 + 贴边收缩
 *
 * 状态机：collapsed | expanded | dragging
 * - tip：仅 hover 展开（无点击）
 * - expanded 且仍记着 edge：指针离开约 3s 缩回该边
 * - 拖拽结束 settle：贴边 → collapsed，否则 → expanded（清空 edge）
 */
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

import {
  readCapsulePlacement,
  writeCapsulePlacement,
  type CapsuleEdge
} from '@/views/overview/lib/capsule-placement'

gsap.registerPlugin(Draggable, InertiaPlugin)

/** 须小于 MARGIN_PX，否则展开落点仍被判定为贴边而再次缩起 */
const EDGE_PX = 4
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
  /** collapsed：当前贴边；expanded：idle 可缩回的边；dragging / 自由展开：null */
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

  /** DOM 只由此写入，避免 dataset / JS 分叉 */
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
    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    if (!boundsWidth || !boundsHeight || !width || !height) return

    const x = findCurrentX()
    const y = findCurrentY()
    const maxX = Math.max(1, boundsWidth - width)
    const maxY = Math.max(1, boundsHeight - height)
    const isCollapsed = mode === 'collapsed'

    writeCapsulePlacement({
      xRatio: clamp(x / maxX, 0, 1),
      yRatio: clamp(y / maxY, 0, 1),
      edge: isCollapsed ? edge : null,
      collapsed: isCollapsed
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

  /** 唯一收缩出口：idle 与 settle 贴边共用 */
  function collapse(side: CapsuleEdge, animDuration: number) {
    clearTimers()
    gsap.killTweensOf(el)
    applyMode('collapsed', side)

    afterLayout(function () {
      const { width, height, boundsWidth, boundsHeight } = findMetrics()
      animateTo(
        findCollapsedX(side, width, boundsWidth),
        clamp(findCurrentY(), 0, Math.max(0, boundsHeight - height)),
        animDuration,
        persist
      )
    })
  }

  /** tip → 展开；保留 edge 供 idle 缩回 */
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
        clamp(findCurrentY(), MARGIN_PX, Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)),
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

  function settle() {
    clearTimers()
    gsap.killTweensOf(el)

    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    const x = findCurrentX()
    const y = findCurrentY()
    const nextY = clamp(y, MARGIN_PX, Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX))
    const nextX = clamp(x, MARGIN_PX, Math.max(MARGIN_PX, boundsWidth - width - MARGIN_PX))

    if (x <= EDGE_PX) {
      collapse('left', duration)
      return
    }
    if (boundsWidth - (x + width) <= EDGE_PX) {
      collapse('right', duration)
      return
    }

    applyMode('expanded', null)
    animateTo(nextX, nextY, duration, persist)
  }

  function placeFromStorage() {
    const placement = readCapsulePlacement()
    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    if (!width || !boundsWidth) return

    clearTimers()
    gsap.set(el, { left: 0, top: 0 })

    if (placement.collapsed && placement.edge) {
      applyMode('collapsed', placement.edge)
      afterLayout(function () {
        const metrics = findMetrics()
        gsap.set(el, {
          x: findCollapsedX(placement.edge!, metrics.width, metrics.boundsWidth),
          y: clamp(
            placement.yRatio * Math.max(0, metrics.boundsHeight - metrics.height),
            0,
            Math.max(0, metrics.boundsHeight - metrics.height)
          )
        })
      })
      return
    }

    applyMode('expanded', null)
    const maxX = Math.max(0, boundsWidth - width)
    const maxY = Math.max(0, boundsHeight - height)
    let x = clamp(placement.xRatio * maxX, MARGIN_PX, Math.max(MARGIN_PX, maxX - MARGIN_PX))
    if (placement.edge === 'left') x = findExpandedX('left', width, boundsWidth)
    if (placement.edge === 'right') x = findExpandedX('right', width, boundsWidth)
    gsap.set(el, {
      x,
      y: clamp(placement.yRatio * maxY, MARGIN_PX, Math.max(MARGIN_PX, maxY))
    })
  }

  function beginDrag() {
    clearTimers()
    gsap.killTweensOf(el)
    isAnimating = false
    // 拖拽接管：取消 idle 归属边；DOM 用展开壳（宽度）
    applyMode('dragging', null)
  }

  const [draggable] = Draggable.create(el, {
    type: 'x,y',
    bounds,
    edgeResistance: 0.65,
    inertia: !isReducedMotion,
    // 整颗胶囊可拖；minimumMovement 区分点击与拖拽
    dragClickables: true,
    zIndexBoost: false,
    minimumMovement: 4,
    onPress() {
      hasDragMoved = false
      clearHoverTimer()
    },
    onDragStart() {
      hasDragMoved = true
      beginDrag()
    },
    onDragEnd() {
      if (this.isThrowing) return
      if (!hasDragMoved) return
      settle()
    },
    onThrowComplete() {
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

    gsap.set(el, {
      x: clamp(findCurrentX(), MARGIN_PX, Math.max(MARGIN_PX, boundsWidth - width - MARGIN_PX)),
      y: clamp(findCurrentY(), MARGIN_PX, Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX))
    })
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
