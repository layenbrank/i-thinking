/**
 * Mirror 磁贴滚动特效
 *
 * 1. 视口进出：每次 out→in 都播方向感知入场（滚动中也播，不静默定格）
 * 2. 跟滚景深：每次滚动会话都驱动 y / opacity / scale，停滚回弹
 * 3. 动效打在 face；缓存几何 + drivers；滚动帧零 querySelector
 */
import gsap from 'gsap'

const ENTER_DURATION = 0.32
const EXIT_DURATION = 0.2
const FOLLOW_MAX_Y = 14
const FOLLOW_SETTLE = 0.34
const EDGE_FADE = 0.32
const EDGE_Y = 16
const EDGE_SCALE = 0.028
const VELOCITY_SETTLE = 0.08
const QUICK_DURATION = 0.16
const SCROLL_IDLE_MS = 140

function hasReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findFace(tile: HTMLElement): HTMLElement {
  return (tile.querySelector('.magnetic-tile-face') as HTMLElement | null) ?? tile
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function findContentTop(tile: HTMLElement, scroller: HTMLElement) {
  const parent = tile.offsetParent as HTMLElement | null
  if (parent && parent !== scroller) return parent.offsetTop + tile.offsetTop
  return tile.offsetTop
}

type TileDrivers = {
  y: (v: number) => void
  opacity: (v: number) => void
  scale: (v: number) => void
}

type TileCache = {
  tile: HTMLElement
  face: HTMLElement
  top: number
  height: number
  drivers: TileDrivers
  ioState: 'in' | 'out' | undefined
  /** 入场 tween 进行中时跟滚暂不抢写 */
  isEntering: boolean
}

function createDrivers(face: HTMLElement): TileDrivers {
  return {
    y: gsap.quickTo(face, 'y', { duration: QUICK_DURATION, ease: 'power3.out' }),
    opacity: gsap.quickTo(face, 'opacity', { duration: QUICK_DURATION, ease: 'power2.out' }),
    scale: gsap.quickTo(face, 'scale', { duration: QUICK_DURATION, ease: 'power2.out' })
  }
}

function clearDragGhost(ghost: HTMLElement | null) {
  if (!ghost) return
  const face = findFace(ghost)
  gsap.killTweensOf(ghost)
  gsap.killTweensOf(face)
  gsap.set(face, { y: 0, opacity: 1, scale: 1 })
  face.style.removeProperty('will-change')
}

function clearTileMotion(tile: HTMLElement) {
  const face = findFace(tile)
  gsap.killTweensOf(tile)
  gsap.killTweensOf(face)
  gsap.set(face, { y: 0, opacity: 1, scale: 1 })
  gsap.set(tile, { y: 0, opacity: 1, scale: 1 })
  face.style.removeProperty('will-change')
  tile.style.removeProperty('will-change')
}

type TileScrollMotionSession = {
  syncTiles: (els: HTMLElement[]) => void
  pause: () => void
  resume: () => void
  destroy: () => void
}

function bindTileScrollMotion(scroller: HTMLElement): TileScrollMotionSession {
  let isPaused = false
  let hasUserScrolled = false
  let scrolling = false
  let willChangeOn = false
  let scrollDirection = 1
  let lastTop = scroller.scrollTop
  let lastTs = performance.now()
  let velocity = 0
  let raf = 0
  let idleTimer = 0
  let settleTween: gsap.core.Tween | null = null

  const cache = new Map<HTMLElement, TileCache>()
  const visible = new Set<HTMLElement>()
  let tracked: HTMLElement[] = []
  let visibleList: TileCache[] = []

  function rebuildVisibleList() {
    visibleList = []
    for (const tile of visible) {
      const item = cache.get(tile)
      if (item) visibleList.push(item)
    }
  }

  function refreshCache(tile: HTMLElement) {
    const prev = cache.get(tile)
    const face = prev?.face && prev.face.isConnected ? prev.face : findFace(tile)
    const drivers = prev && prev.face === face ? prev.drivers : createDrivers(face)

    cache.set(tile, {
      tile,
      face,
      top: findContentTop(tile, scroller),
      height: tile.offsetHeight || prev?.height || 60,
      drivers,
      ioState: prev?.ioState,
      isEntering: prev?.isEntering ?? false
    })
  }

  function renewDrivers(item: TileCache) {
    item.drivers = createDrivers(item.face)
  }

  function setWillChange(isOn: boolean) {
    if (willChangeOn === isOn) return
    willChangeOn = isOn
    for (let i = 0; i < visibleList.length; i++) {
      const face = visibleList[i].face
      if (isOn) face.style.willChange = 'transform, opacity'
      else face.style.removeProperty('will-change')
    }
  }

  function hardResetVisible() {
    settleTween?.kill()
    settleTween = null
    setWillChange(false)
    for (let i = 0; i < visibleList.length; i++) {
      const item = visibleList[i]
      item.isEntering = false
      gsap.killTweensOf(item.face)
      gsap.set(item.face, { y: 0, opacity: 1, scale: 1 })
      renewDrivers(item)
    }
  }

  function playEnter(item: TileCache) {
    if (item.ioState === 'in') return
    const prev = item.ioState
    item.ioState = 'in'

    // 首屏首次出现：定格，避免闪烁
    if (prev !== 'out' || hasReducedMotion() || isPaused) {
      item.isEntering = false
      gsap.killTweensOf(item.face)
      gsap.set(item.face, { opacity: 1, y: 0, scale: 1 })
      renewDrivers(item)
      return
    }

    // 每次 out→in 都播（含滚动中），不再静默定格
    item.isEntering = true
    const fromY = scrollDirection >= 0 ? 28 : -28
    gsap.fromTo(
      item.face,
      { opacity: 0.18, y: fromY, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: ENTER_DURATION,
        ease: 'power3.out',
        overwrite: 'auto',
        onComplete: function () {
          item.isEntering = false
          renewDrivers(item)
        }
      }
    )
  }

  function playExit(item: TileCache) {
    if (item.ioState === 'out') return
    item.ioState = 'out'
    item.isEntering = false

    // 滚动中只记状态，避免 IO 抖动连环退场；停滚时轻退
    if (scrolling || hasReducedMotion() || isPaused) {
      gsap.killTweensOf(item.face)
      gsap.set(item.face, { y: 0, opacity: 1, scale: 1 })
      renewDrivers(item)
      return
    }

    gsap.to(item.face, {
      opacity: 0.35,
      y: scrollDirection >= 0 ? -12 : 12,
      scale: 0.96,
      duration: EXIT_DURATION,
      ease: 'power2.in',
      overwrite: 'auto',
      onComplete: function () {
        gsap.set(item.face, { y: 0, opacity: 1, scale: 1 })
        renewDrivers(item)
      }
    })
  }

  function applyScrollFx() {
    const scrollTop = scroller.scrollTop
    const viewH = scroller.clientHeight
    if (viewH <= 0) return

    const rootCenter = scrollTop + viewH / 2
    const half = viewH / 2
    const inertiaY = clamp(-velocity * 0.65, -FOLLOW_MAX_Y, FOLLOW_MAX_Y)
    const speedBoost = clamp(Math.abs(velocity) * 0.001, 0, 0.025)

    for (let i = 0; i < visibleList.length; i++) {
      const item = visibleList[i]
      if (item.isEntering) continue

      const progress = clamp((item.top + item.height / 2 - rootCenter) / half, -1, 1)
      const edge = easeOutCubic(Math.abs(progress))

      item.drivers.y(progress * EDGE_Y * 0.55 + inertiaY)
      item.drivers.opacity(clamp(1 - edge * EDGE_FADE, 0.55, 1))
      item.drivers.scale(clamp(1 - edge * EDGE_SCALE - speedBoost, 0.94, 1))
    }
  }

  function settle() {
    scrolling = false
    if (idleTimer) {
      window.clearTimeout(idleTimer)
      idleTimer = 0
    }

    if (!hasUserScrolled || isPaused || hasReducedMotion()) {
      hardResetVisible()
      return
    }

    settleTween?.kill()
    setWillChange(true)

    const faces: HTMLElement[] = []
    for (let i = 0; i < visibleList.length; i++) {
      const item = visibleList[i]
      item.isEntering = false
      faces.push(item.face)
    }

    settleTween = gsap.to(faces, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: FOLLOW_SETTLE,
      ease: 'power3.out',
      overwrite: 'auto',
      onComplete: function () {
        for (let i = 0; i < visibleList.length; i++) {
          const item = visibleList[i]
          gsap.set(item.face, { y: 0, opacity: 1, scale: 1 })
          renewDrivers(item)
        }
        setWillChange(false)
        settleTween = null
      }
    })
  }

  function onFrame(ts: number) {
    raf = 0
    if (isPaused || hasReducedMotion()) return

    const dt = Math.max(1, ts - lastTs)
    const top = scroller.scrollTop
    const delta = top - lastTop
    if (delta !== 0) scrollDirection = delta > 0 ? 1 : -1

    const instant = (delta / dt) * 16
    velocity = velocity * 0.68 + instant * 0.32
    lastTop = top
    lastTs = ts

    // 滚动会话未结束（仍有 scroll 事件续命）时持续跟滚，不因瞬时 delta≈0 提前 settle
    if (scrolling) {
      setWillChange(true)
      applyScrollFx()
      raf = requestAnimationFrame(onFrame)
      return
    }

    if (Math.abs(velocity) >= VELOCITY_SETTLE) {
      setWillChange(true)
      applyScrollFx()
      raf = requestAnimationFrame(onFrame)
      return
    }

    velocity = 0
    settle()
  }

  function onScrollIdle() {
    idleTimer = 0
    scrolling = false
    // 交给 onFrame 用剩余速度收尾，或直接 settle
    if (!raf) {
      lastTs = performance.now()
      raf = requestAnimationFrame(onFrame)
    }
  }

  function onScroll() {
    if (isPaused || hasReducedMotion()) return
    hasUserScrolled = true
    scrolling = true

    settleTween?.kill()
    settleTween = null

    if (idleTimer) window.clearTimeout(idleTimer)
    idleTimer = window.setTimeout(onScrollIdle, SCROLL_IDLE_MS)

    if (!raf) {
      lastTs = performance.now()
      raf = requestAnimationFrame(onFrame)
    }
  }

  function onResize() {
    for (const tile of tracked) {
      const item = cache.get(tile)
      if (!item) {
        refreshCache(tile)
        continue
      }
      item.top = findContentTop(tile, scroller)
      item.height = tile.offsetHeight || item.height
    }
    rebuildVisibleList()
  }

  const visibilityObserver = new IntersectionObserver(
    function (entries) {
      let listDirty = false
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        let item = cache.get(el)
        if (!item) {
          refreshCache(el)
          item = cache.get(el)
        }
        if (!item) continue

        if (entry.isIntersecting) {
          if (!visible.has(el)) {
            visible.add(el)
            listDirty = true
          }
          playEnter(item)
        } else {
          if (visible.delete(el)) listDirty = true
          playExit(item)
        }
      }
      if (listDirty) rebuildVisibleList()
    },
    // 不用过大 rootMargin，减少边缘 IO 抖动；进出仍可靠触发
    { root: scroller, rootMargin: '0px', threshold: 0 }
  )

  scroller.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })

  return {
    syncTiles: function (els) {
      const next = new Set(els)
      for (const el of tracked) {
        if (!next.has(el)) {
          visibilityObserver.unobserve(el)
          visible.delete(el)
          cache.delete(el)
        }
      }
      for (const el of els) {
        if (!tracked.includes(el)) {
          visibilityObserver.observe(el)
          refreshCache(el)
        } else {
          const item = cache.get(el)
          if (item) {
            item.top = findContentTop(el, scroller)
            item.height = el.offsetHeight || item.height
          } else {
            refreshCache(el)
          }
        }
      }
      tracked = els
      rebuildVisibleList()
    },
    pause: function () {
      isPaused = true
      scrolling = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (idleTimer) {
        window.clearTimeout(idleTimer)
        idleTimer = 0
      }
      hardResetVisible()
      for (const el of tracked) clearTileMotion(el)
    },
    resume: function () {
      isPaused = false
      lastTop = scroller.scrollTop
      velocity = 0
      scrolling = false
      for (const el of tracked) refreshCache(el)
      rebuildVisibleList()
    },
    destroy: function () {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      if (idleTimer) window.clearTimeout(idleTimer)
      hardResetVisible()
      visibilityObserver.disconnect()
      cache.clear()
      visible.clear()
      visibleList = []
      tracked = []
    }
  }
}

export {
  hasReducedMotion,
  clearDragGhost,
  clearTileMotion,
  bindTileScrollMotion,
  FOLLOW_MAX_Y,
  ENTER_DURATION
}

export type { TileScrollMotionSession }
