/**
 * Mirror 磁贴滚动特效
 *
 * - 视口进出：out→in 方向感知入场（滚动中也播）
 * - 跟滚景深：滚动会话驱动 y / opacity / scale，停滚回弹
 * - 波纹：空间相位 sin 叠加（海浪感）；停滚按距中心 stagger 涟漪回落
 * - 动效打在 surface；几何与 drivers 缓存；滚动帧零 querySelector
 * - pause 仅供真实拖拽期间使用；幂等 pause/resume
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

/** 波纹振幅（px） */
const WAVE_AMP = 6
/** 纵向相位频率（约 1–1.5 波长跨视口） */
const WAVE_Y_FREQ = 0.012
/** 横向相位频率（网格次波） */
const WAVE_X_FREQ = 0.018
/** 滚动位移耦合进相位（浪头跟滚） */
const WAVE_SCROLL = 0.014
/** |velocity| → 波纹强度 */
const WAVE_VEL_SCALE = 0.045
/** cos 相位弱 scale 调制 */
const WAVE_SCALE_AMP = 0.008
/** 停滚涟漪 stagger 总跨度（s） */
const SETTLE_STAGGER = 0.12

function hasReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findSurface(tile: HTMLElement): HTMLElement {
  return (tile.querySelector('.magnetic-tile-surface') as HTMLElement | null) ?? tile
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

/** 相对 scroller 内容顶边的 offset（支持一层 offsetParent） */
function findContentTop(tile: HTMLElement, scroller: HTMLElement) {
  const parent = tile.offsetParent as HTMLElement | null
  if (parent && parent !== scroller) return parent.offsetTop + tile.offsetTop
  return tile.offsetTop
}

/** 相对 scroller 内容左边的 offset（支持一层 offsetParent） */
function findContentLeft(tile: HTMLElement, scroller: HTMLElement) {
  const parent = tile.offsetParent as HTMLElement | null
  if (parent && parent !== scroller) return parent.offsetLeft + tile.offsetLeft
  return tile.offsetLeft
}

type TileDrivers = {
  y: (v: number) => void
  opacity: (v: number) => void
  scale: (v: number) => void
}

type TileCache = {
  tile: HTMLElement
  surface: HTMLElement
  top: number
  left: number
  height: number
  width: number
  drivers: TileDrivers
  ioState: 'in' | 'out' | undefined
  /** 入场 tween 进行中时跟滚暂不抢写 */
  isEntering: boolean
}

type TileScrollFx = {
  track: (els: HTMLElement[]) => void
  pause: () => void
  resume: () => void
  destroy: () => void
}

/** 将 quickTo 驱动绑到 surface（y / opacity / scale） */
function bindDrivers(surface: HTMLElement): TileDrivers {
  return {
    y: gsap.quickTo(surface, 'y', { duration: QUICK_DURATION, ease: 'power3.out' }),
    opacity: gsap.quickTo(surface, 'opacity', { duration: QUICK_DURATION, ease: 'power2.out' }),
    scale: gsap.quickTo(surface, 'scale', { duration: QUICK_DURATION, ease: 'power2.out' })
  }
}

/** 刷新几何缓存字段（top / left / size） */
function applyGeometry(item: TileCache, tile: HTMLElement, scroller: HTMLElement) {
  item.top = findContentTop(tile, scroller)
  item.left = findContentLeft(tile, scroller)
  item.height = tile.offsetHeight || item.height
  item.width = tile.offsetWidth || item.width
}

/** 清除拖拽 fallback 幽灵上的 GSAP 残留 */
function clearDragGhost(ghost: HTMLElement | null) {
  if (!ghost) return
  const surface = findSurface(ghost)
  gsap.killTweensOf(ghost)
  gsap.killTweensOf(surface)
  gsap.set(surface, { y: 0, opacity: 1, scale: 1 })
  surface.style.removeProperty('will-change')
}

/** 将单块磁贴还原为静止态（拖拽 choose 时用，避免 transform 冲突） */
function clearTileFx(tile: HTMLElement) {
  const surface = findSurface(tile)
  gsap.killTweensOf(tile)
  gsap.killTweensOf(surface)
  gsap.set(surface, { y: 0, opacity: 1, scale: 1 })
  gsap.set(tile, { y: 0, opacity: 1, scale: 1 })
  surface.style.removeProperty('will-change')
  tile.style.removeProperty('will-change')
}

function bindTileScrollFx(scroller: HTMLElement): TileScrollFx {
  let isPaused = false
  let hasUserScrolled = false
  let isScrolling = false
  let hasWillChange = false
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
  let visibles: TileCache[] = []

  function rebuildVisibles() {
    visibles = []
    for (const tile of visible) {
      const item = cache.get(tile)
      if (item) visibles.push(item)
    }
  }

  function refreshCache(tile: HTMLElement) {
    const prev = cache.get(tile)
    const surface = prev?.surface && prev.surface.isConnected ? prev.surface : findSurface(tile)
    const drivers = prev && prev.surface === surface ? prev.drivers : bindDrivers(surface)

    cache.set(tile, {
      tile,
      surface,
      top: findContentTop(tile, scroller),
      left: findContentLeft(tile, scroller),
      height: tile.offsetHeight || prev?.height || 60,
      width: tile.offsetWidth || prev?.width || 60,
      drivers,
      ioState: prev?.ioState,
      isEntering: prev?.isEntering ?? false
    })
  }

  function rebindDrivers(item: TileCache) {
    item.drivers = bindDrivers(item.surface)
  }

  function updateWillChange(isOn: boolean) {
    if (hasWillChange === isOn) return
    hasWillChange = isOn
    for (let i = 0; i < visibles.length; i++) {
      const surface = visibles[i].surface
      if (isOn) surface.style.willChange = 'transform, opacity'
      else surface.style.removeProperty('will-change')
    }
  }

  function hardResetVisible() {
    settleTween?.kill()
    settleTween = null
    updateWillChange(false)
    for (let i = 0; i < visibles.length; i++) {
      const item = visibles[i]
      item.isEntering = false
      gsap.killTweensOf(item.surface)
      gsap.set(item.surface, { y: 0, opacity: 1, scale: 1 })
      rebindDrivers(item)
    }
  }

  /** 视口入场 */
  function playEnter(item: TileCache) {
    if (item.ioState === 'in') return
    const prev = item.ioState
    item.ioState = 'in'

    // 首屏首次出现：定格，避免闪烁
    if (prev !== 'out' || hasReducedMotion() || isPaused) {
      item.isEntering = false
      gsap.killTweensOf(item.surface)
      gsap.set(item.surface, { opacity: 1, y: 0, scale: 1 })
      rebindDrivers(item)
      return
    }

    item.isEntering = true
    const fromY = scrollDirection >= 0 ? 28 : -28
    // 先杀掉 quickTo，避免 overwrite:'auto' 对 scale/y/opacity 触发 reset 警告
    gsap.killTweensOf(item.surface)
    gsap.fromTo(
      item.surface,
      { opacity: 0.18, y: fromY, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: ENTER_DURATION,
        ease: 'power3.out',
        onComplete() {
          item.isEntering = false
          rebindDrivers(item)
        }
      }
    )
  }

  /** 视口退场（滚动中只记状态，避免 IO 抖动连环退场） */
  function playExit(item: TileCache) {
    if (item.ioState === 'out') return
    item.ioState = 'out'
    item.isEntering = false

    if (isScrolling || hasReducedMotion() || isPaused) {
      gsap.killTweensOf(item.surface)
      gsap.set(item.surface, { y: 0, opacity: 1, scale: 1 })
      rebindDrivers(item)
      return
    }

    gsap.killTweensOf(item.surface)
    gsap.to(item.surface, {
      opacity: 0.35,
      y: scrollDirection >= 0 ? -12 : 12,
      scale: 0.96,
      duration: EXIT_DURATION,
      ease: 'power2.in',
      onComplete() {
        gsap.set(item.surface, { y: 0, opacity: 1, scale: 1 })
        rebindDrivers(item)
      }
    })
  }

  /** 跟滚景深 + 空间相位波纹 */
  function applyScrollFx() {
    const scrollTop = scroller.scrollTop
    const viewH = scroller.clientHeight
    if (viewH <= 0) return

    const rootCenter = scrollTop + viewH / 2
    const half = viewH / 2
    const inertiaY = clamp(-velocity * 0.65, -FOLLOW_MAX_Y, FOLLOW_MAX_Y)
    const speedBoost = clamp(Math.abs(velocity) * 0.001, 0, 0.025)
    const intensity = clamp(Math.abs(velocity) * WAVE_VEL_SCALE, 0, 1)

    for (let i = 0; i < visibles.length; i++) {
      const item = visibles[i]
      if (item.isEntering) continue

      const progress = clamp((item.top + item.height / 2 - rootCenter) / half, -1, 1)
      const edge = easeOutCubic(Math.abs(progress))
      const phase = item.top * WAVE_Y_FREQ + item.left * WAVE_X_FREQ + scrollTop * WAVE_SCROLL
      const amp = WAVE_AMP * intensity * (0.35 + 0.65 * edge)
      const waveY = Math.sin(phase) * amp
      const waveScale = Math.cos(phase) * WAVE_SCALE_AMP * intensity

      item.drivers.y(progress * EDGE_Y * 0.55 + inertiaY + waveY)
      item.drivers.opacity(clamp(1 - edge * EDGE_FADE, 0.55, 1))
      item.drivers.scale(clamp(1 - edge * EDGE_SCALE - speedBoost + waveScale, 0.94, 1))
    }
  }

  /** 停滚涟漪回弹：按距视口中心近→远 stagger */
  function settle() {
    isScrolling = false
    if (idleTimer) {
      window.clearTimeout(idleTimer)
      idleTimer = 0
    }

    if (!hasUserScrolled || isPaused || hasReducedMotion()) {
      hardResetVisible()
      return
    }

    settleTween?.kill()
    updateWillChange(true)

    const scrollTop = scroller.scrollTop
    const viewH = scroller.clientHeight
    const viewW = scroller.clientWidth
    const rootCenterY = scrollTop + viewH / 2
    const rootCenterX = scroller.scrollLeft + viewW / 2

    const ranked: { surface: HTMLElement; dist: number; item: TileCache }[] = []
    for (let i = 0; i < visibles.length; i++) {
      const item = visibles[i]
      item.isEntering = false
      gsap.killTweensOf(item.surface)
      const cy = item.top + item.height / 2
      const cx = item.left + item.width / 2
      const dist = Math.hypot(cy - rootCenterY, cx - rootCenterX)
      ranked.push({ surface: item.surface, dist, item })
    }

    ranked.sort(function (a, b) {
      return a.dist - b.dist
    })

    const surfaces: HTMLElement[] = []
    for (let i = 0; i < ranked.length; i++) {
      surfaces.push(ranked[i].surface)
    }

    if (!surfaces.length) {
      updateWillChange(false)
      return
    }

    settleTween = gsap.to(surfaces, {
      y: 0,
      opacity: 1,
      scale: 1,
      duration: FOLLOW_SETTLE,
      ease: 'power3.out',
      stagger: { amount: SETTLE_STAGGER, from: 'start' },
      onComplete() {
        for (let i = 0; i < visibles.length; i++) {
          const item = visibles[i]
          gsap.set(item.surface, { y: 0, opacity: 1, scale: 1 })
          rebindDrivers(item)
        }
        updateWillChange(false)
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

    // 滚动会话未结束时持续跟滚，不因瞬时 delta≈0 提前 settle
    if (isScrolling) {
      updateWillChange(true)
      applyScrollFx()
      raf = requestAnimationFrame(onFrame)
      return
    }

    if (Math.abs(velocity) >= VELOCITY_SETTLE) {
      updateWillChange(true)
      applyScrollFx()
      raf = requestAnimationFrame(onFrame)
      return
    }

    velocity = 0
    settle()
  }

  function onScrollIdle() {
    idleTimer = 0
    isScrolling = false
    if (!raf) {
      lastTs = performance.now()
      raf = requestAnimationFrame(onFrame)
    }
  }

  function onScroll() {
    if (isPaused || hasReducedMotion()) return
    hasUserScrolled = true
    isScrolling = true

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
      applyGeometry(item, tile, scroller)
    }
    rebuildVisibles()
  }

  const visibilityObserver = new IntersectionObserver(
    function (entries) {
      let isDirty = false
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
            isDirty = true
          }
          playEnter(item)
        } else {
          if (visible.delete(el)) isDirty = true
          playExit(item)
        }
      }
      if (isDirty) rebuildVisibles()
    },
    { root: scroller, rootMargin: '0px', threshold: 0 }
  )

  scroller.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize, { passive: true })

  return {
    /** 同步当前网格内磁贴节点（增删 / 几何刷新） */
    track(els) {
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
            applyGeometry(item, el, scroller)
          } else {
            refreshCache(el)
          }
        }
      }
      tracked = els
      rebuildVisibles()
    },
    /** 拖拽开始：停跟滚并清 transform，避免与 Sortable 抢写 */
    pause() {
      if (isPaused) return
      isPaused = true
      isScrolling = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (idleTimer) {
        window.clearTimeout(idleTimer)
        idleTimer = 0
      }
      hardResetVisible()
      for (const el of tracked) clearTileFx(el)
    },
    /** 拖拽结束或取消：恢复跟滚能力（幂等） */
    resume() {
      isPaused = false
      lastTop = scroller.scrollTop
      velocity = 0
      isScrolling = false
      for (const el of tracked) refreshCache(el)
      rebuildVisibles()
    },
    destroy() {
      scroller.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      if (raf) cancelAnimationFrame(raf)
      if (idleTimer) window.clearTimeout(idleTimer)
      hardResetVisible()
      visibilityObserver.disconnect()
      cache.clear()
      visible.clear()
      visibles = []
      tracked = []
    }
  }
}

export {
  bindTileScrollFx,
  clearDragGhost,
  clearTileFx,
  ENTER_DURATION,
  FOLLOW_MAX_Y,
  hasReducedMotion
}

export type { TileScrollFx }
