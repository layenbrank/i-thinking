/**
 * Overview 胶囊拖拽：容器内 Draggable + Inertia，松手贴左右边缩起
 *
 * 单一 settle()：贴边 → peek；否则 clamp。peek 单击 expand()。
 */
import gsap from 'gsap'
import { Draggable } from 'gsap/Draggable'
import { InertiaPlugin } from 'gsap/InertiaPlugin'

gsap.registerPlugin(Draggable, InertiaPlugin)

/** 须小于 MARGIN_PX，否则展开落点仍被判定为贴边而再次缩起 */
const EDGE_PX = 12
const PEEK_PX = 14
const MARGIN_PX = 24
const SETTLE_DURATION = 0.28
const SETTLE_EASE = 'power3.out'

type CapsuleEdge = 'left' | 'right'

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

function parseEdge(value: string | undefined): CapsuleEdge | null {
  if (value === 'left' || value === 'right') return value
  return null
}

function bindCapsuleDrag(
  el: HTMLElement,
  bounds: HTMLElement,
  options?: CapsuleDragOptions
): CapsuleDrag {
  const isReducedMotion = options?.reducedMotion ?? prefersReducedMotion()
  const duration = isReducedMotion ? 0 : SETTLE_DURATION

  let edge: CapsuleEdge | null = null
  let isSettling = false

  function findMetrics() {
    return {
      width: el.offsetWidth,
      height: el.offsetHeight,
      boundsWidth: bounds.clientWidth,
      boundsHeight: bounds.clientHeight
    }
  }

  function findEdgeSide() {
    return edge ?? parseEdge(el.dataset.edge)
  }

  function markExpanded() {
    edge = null
    delete el.dataset.collapsed
    delete el.dataset.edge
    el.setAttribute('aria-expanded', 'true')
  }

  function markCollapsed(side: CapsuleEdge) {
    edge = side
    el.dataset.collapsed = 'true'
    el.dataset.edge = side
    el.setAttribute('aria-expanded', 'false')
  }

  function findCollapsedX(side: CapsuleEdge, width: number, boundsWidth: number) {
    if (side === 'left') return PEEK_PX - width
    return boundsWidth - PEEK_PX
  }

  function findExpandedX(side: CapsuleEdge, width: number, boundsWidth: number) {
    if (side === 'left') return MARGIN_PX
    return boundsWidth - width - MARGIN_PX
  }

  function placeInitial() {
    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    gsap.set(el, {
      left: 0,
      top: 0,
      x: boundsWidth - width - MARGIN_PX,
      y: Math.max(MARGIN_PX, (boundsHeight - height) / 2)
    })
    markExpanded()
  }

  function expand() {
    const side = findEdgeSide()
    if (!side) return

    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    const x = findExpandedX(side, width, boundsWidth)
    const y = clamp(
      Number(gsap.getProperty(el, 'y')) || 0,
      MARGIN_PX,
      Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)
    )

    isSettling = true
    gsap.killTweensOf(el)
    markExpanded()
    gsap.to(el, {
      x,
      y,
      duration,
      ease: SETTLE_EASE,
      overwrite: true,
      onComplete() {
        isSettling = false
      }
    })
  }

  function settle() {
    if (isSettling) return

    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    const x = Number(gsap.getProperty(el, 'x')) || 0
    const y = Number(gsap.getProperty(el, 'y')) || 0
    const maxY = Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)
    const nextY = clamp(y, MARGIN_PX, maxY)

    const distLeft = x
    const distRight = boundsWidth - (x + width)

    let nextX = clamp(x, MARGIN_PX, Math.max(MARGIN_PX, boundsWidth - width - MARGIN_PX))
    let nextEdge: CapsuleEdge | null = null

    if (distLeft <= EDGE_PX) {
      nextEdge = 'left'
      nextX = findCollapsedX('left', width, boundsWidth)
    } else if (distRight <= EDGE_PX) {
      nextEdge = 'right'
      nextX = findCollapsedX('right', width, boundsWidth)
    }

    isSettling = true
    gsap.killTweensOf(el)

    if (nextEdge) markCollapsed(nextEdge)
    else markExpanded()

    gsap.to(el, {
      x: nextX,
      y: nextY,
      duration,
      ease: SETTLE_EASE,
      overwrite: true,
      onComplete() {
        isSettling = false
      }
    })
  }

  const [draggable] = Draggable.create(el, {
    type: 'x,y',
    bounds,
    edgeResistance: 0.65,
    inertia: !isReducedMotion,
    dragClickables: false,
    zIndexBoost: false,
    onDragStart() {
      gsap.killTweensOf(el)
      isSettling = false
      // 仅揭开内容便于拖；保留 data-edge / edge，供单击 expand
      if (el.dataset.collapsed === 'true') {
        delete el.dataset.collapsed
        el.setAttribute('aria-expanded', 'true')
      }
    },
    onDragEnd() {
      if (this.isThrowing) return
      settle()
    },
    onThrowComplete() {
      settle()
    },
    onClick() {
      if (!findEdgeSide()) return
      expand()
    }
  })

  function onResize() {
    if (!draggable) return
    draggable.applyBounds(bounds)
    const { width, height, boundsWidth, boundsHeight } = findMetrics()
    if (!width || !boundsWidth) return

    const y = clamp(
      Number(gsap.getProperty(el, 'y')) || 0,
      MARGIN_PX,
      Math.max(MARGIN_PX, boundsHeight - height - MARGIN_PX)
    )

    if (el.dataset.collapsed === 'true') {
      const side = findEdgeSide()
      if (!side) return
      gsap.set(el, {
        x: findCollapsedX(side, width, boundsWidth),
        y
      })
      return
    }

    gsap.set(el, {
      x: clamp(
        Number(gsap.getProperty(el, 'x')) || 0,
        MARGIN_PX,
        Math.max(MARGIN_PX, boundsWidth - width - MARGIN_PX)
      ),
      y
    })
  }

  placeInitial()
  requestAnimationFrame(function () {
    placeInitial()
    draggable.applyBounds(bounds)
  })

  const resizeObserver = new ResizeObserver(onResize)
  resizeObserver.observe(bounds)

  return {
    destroy() {
      resizeObserver.disconnect()
      gsap.killTweensOf(el)
      draggable?.kill()
    }
  }
}

export { bindCapsuleDrag }
export type { CapsuleDrag, CapsuleDragOptions }
