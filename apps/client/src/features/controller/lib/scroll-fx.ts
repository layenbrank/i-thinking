/**
 * Mirror 磁贴滚动特效
 *
 * - 进出场：ScrollTrigger.batch（方向感）
 * - 跟滚：滚动会话内边缘景深 + 轻量波纹；停滚回弹
 * - pause / resume 供 Sortable 拖拽互斥
 */
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

/** 实体磁贴（排除 Suspense 骨架） */
const TILE = '.magnetic-tile:not(.magnetic-tile-skeleton)'
const SURFACE = '.magnetic-tile-surface'

const ENTER_Y = 28
const ENTER_MS = 0.36
const ENTER_STAGGER = 0.06
const BATCH_START = 'top 85%'
const BATCH_END = 'bottom top'
const BATCH_INTERVAL = 0.08
const BATCH_MAX = 8
/** 清整段 transform，避免对 scale 单独 clearProps 告警 */
const CLEAR_PROPS = 'transform,opacity,visibility'

const FOLLOW_Y = 14
const FOLLOW_SETTLE = 0.34
const EDGE_FADE = 0.32
const EDGE_Y = 16
const EDGE_SCALE = 0.028
const VELOCITY_IDLE = 0.08
const QUICK_MS = 0.16
const SCROLL_IDLE_MS = 140

const WAVE_AMP = 6
const WAVE_Y_FREQ = 0.012
const WAVE_X_FREQ = 0.018
const WAVE_SCROLL = 0.014
const WAVE_VEL = 0.045
const WAVE_SCALE = 0.008
const SETTLE_STAGGER = 0.12

gsap.registerPlugin(ScrollTrigger)

type Drivers = {
  y: (value: number) => void
  opacity: (value: number) => void
  scaleX: (value: number) => void
  scaleY: (value: number) => void
}

type Tile = {
  el: HTMLElement
  surface: HTMLElement
  top: number
  left: number
  height: number
  width: number
  drivers: Drivers
}

type ScrollFx = {
  track(tiles: HTMLElement[]): void
  pause(): void
  resume(): void
  destroy(): void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function findSurface(tile: HTMLElement): HTMLElement {
  return (tile.querySelector(SURFACE) as HTMLElement | null) ?? tile
}

function findOffsetTop(tile: HTMLElement, scroller: HTMLElement) {
  const parent = tile.offsetParent as HTMLElement | null
  if (parent && parent !== scroller) return parent.offsetTop + tile.offsetTop
  return tile.offsetTop
}

function findOffsetLeft(tile: HTMLElement, scroller: HTMLElement) {
  const parent = tile.offsetParent as HTMLElement | null
  if (parent && parent !== scroller) return parent.offsetLeft + tile.offsetLeft
  return tile.offsetLeft
}

function bindDrivers(surface: HTMLElement): Drivers {
  return {
    y: gsap.quickTo(surface, 'y', { duration: QUICK_MS, ease: 'power3.out' }),
    opacity: gsap.quickTo(surface, 'opacity', {
      duration: QUICK_MS,
      ease: 'power2.out'
    }),
    scaleX: gsap.quickTo(surface, 'scaleX', {
      duration: QUICK_MS,
      ease: 'power2.out'
    }),
    scaleY: gsap.quickTo(surface, 'scaleY', {
      duration: QUICK_MS,
      ease: 'power2.out'
    })
  }
}

function writeScale(drivers: Drivers, value: number) {
  drivers.scaleX(value)
  drivers.scaleY(value)
}

function syncGeometry(tile: Tile, el: HTMLElement, scroller: HTMLElement) {
  tile.top = findOffsetTop(el, scroller)
  tile.left = findOffsetLeft(el, scroller)
  tile.height = el.offsetHeight || tile.height
  tile.width = el.offsetWidth || tile.width
}

function clearGhost(ghost: HTMLElement | null) {
  if (!ghost) return
  const surface = findSurface(ghost)
  gsap.killTweensOf(ghost)
  gsap.killTweensOf(surface)
  gsap.set(surface, { clearProps: CLEAR_PROPS })
  surface.style.removeProperty('will-change')
}

function clearFx(tile: HTMLElement) {
  const surface = findSurface(tile)
  gsap.killTweensOf(tile)
  gsap.killTweensOf(surface)
  gsap.set(surface, { clearProps: CLEAR_PROPS })
  gsap.set(tile, { clearProps: CLEAR_PROPS })
  surface.style.removeProperty('will-change')
  tile.style.removeProperty('will-change')
}

function bindScrollFx(scroller: HTMLElement): ScrollFx {
  const cache = new Map<HTMLElement, Tile>()
  let tracked: HTMLElement[] = []
  let triggers: ScrollTrigger[] = []
  let media: gsap.MatchMedia | null = null
  let canMotion = true
  let isDragging = false
  let isScrolling = false
  let hasScrolled = false
  let lastTop = scroller.scrollTop
  let lastTs = performance.now()
  let velocity = 0
  let raf = 0
  let idleTimer = 0
  let settleTween: gsap.core.Tween | null = null
  let hasWillChange = false

  function findTiles() {
    const tiles: Tile[] = []
    for (const el of tracked) {
      const tile = cache.get(el)
      if (tile) tiles.push(tile)
    }
    return tiles
  }

  function syncTile(el: HTMLElement) {
    const prev = cache.get(el)
    const surface =
      prev?.surface && prev.surface.isConnected ? prev.surface : findSurface(el)
    const drivers = prev && prev.surface === surface ? prev.drivers : bindDrivers(surface)

    cache.set(el, {
      el,
      surface,
      top: findOffsetTop(el, scroller),
      left: findOffsetLeft(el, scroller),
      height: el.offsetHeight || prev?.height || 60,
      width: el.offsetWidth || prev?.width || 60,
      drivers
    })
  }

  function syncWillChange(isOn: boolean) {
    if (hasWillChange === isOn) return
    hasWillChange = isOn
    for (const tile of findTiles()) {
      if (isOn) tile.surface.style.willChange = 'transform, opacity'
      else tile.surface.style.removeProperty('will-change')
    }
  }

  function rest(surfaces: HTMLElement[]) {
    if (surfaces.length === 0) return
    gsap.killTweensOf(surfaces)
    gsap.set(surfaces, { clearProps: CLEAR_PROPS })
  }

  function reset() {
    settleTween?.kill()
    settleTween = null
    syncWillChange(false)
    rest(
      findTiles().map(function (tile) {
        return tile.surface
      })
    )
  }

  function enter(batch: HTMLElement[], fromY: number) {
    if (batch.length === 0 || isDragging) return
    const surfaces = batch.map(findSurface)
    gsap.killTweensOf(surfaces)
    gsap.fromTo(
      surfaces,
      { autoAlpha: 0, y: fromY, scaleX: 0.96, scaleY: 0.96 },
      {
        autoAlpha: 1,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        duration: ENTER_MS,
        ease: 'power3.out',
        stagger: ENTER_STAGGER,
        clearProps: CLEAR_PROPS
      }
    )
  }

  function hide(batch: HTMLElement[], readyY: number) {
    if (batch.length === 0 || isDragging) return
    const surfaces = batch.map(findSurface)
    gsap.killTweensOf(surfaces)
    gsap.set(surfaces, {
      autoAlpha: 0,
      y: readyY,
      scaleX: 0.96,
      scaleY: 0.96
    })
  }

  function follow() {
    const tiles = findTiles()
    const scrollTop = scroller.scrollTop
    const viewH = scroller.clientHeight
    if (viewH <= 0 || tiles.length === 0) return

    const center = scrollTop + viewH / 2
    const half = viewH / 2
    const inertiaY = clamp(-velocity * 0.65, -FOLLOW_Y, FOLLOW_Y)
    const speedBoost = clamp(Math.abs(velocity) * 0.001, 0, 0.025)
    const intensity = clamp(Math.abs(velocity) * WAVE_VEL, 0, 1)

    for (const tile of tiles) {
      if (gsap.isTweening(tile.surface)) continue

      const progress = clamp((tile.top + tile.height / 2 - center) / half, -1, 1)
      const edge = easeOutCubic(Math.abs(progress))
      const phase = tile.top * WAVE_Y_FREQ + tile.left * WAVE_X_FREQ + scrollTop * WAVE_SCROLL
      const amp = WAVE_AMP * intensity * (0.35 + 0.65 * edge)
      const waveY = Math.sin(phase) * amp
      const waveScale = Math.cos(phase) * WAVE_SCALE * intensity

      tile.drivers.y(progress * EDGE_Y * 0.55 + inertiaY + waveY)
      tile.drivers.opacity(clamp(1 - edge * EDGE_FADE, 0.55, 1))
      writeScale(
        tile.drivers,
        clamp(1 - edge * EDGE_SCALE - speedBoost + waveScale, 0.94, 1)
      )
    }
  }

  function settle() {
    isScrolling = false
    if (idleTimer) {
      window.clearTimeout(idleTimer)
      idleTimer = 0
    }

    if (!hasScrolled || isDragging) {
      reset()
      return
    }

    settleTween?.kill()
    syncWillChange(true)

    const scrollTop = scroller.scrollTop
    const viewH = scroller.clientHeight
    const viewW = scroller.clientWidth
    const centerY = scrollTop + viewH / 2
    const centerX = scroller.scrollLeft + viewW / 2

    const ranked = findTiles()
      .map(function (tile) {
        const cy = tile.top + tile.height / 2
        const cx = tile.left + tile.width / 2
        return {
          surface: tile.surface,
          dist: Math.hypot(cy - centerY, cx - centerX)
        }
      })
      .sort(function (a, b) {
        return a.dist - b.dist
      })

    const surfaces = ranked.map(function (item) {
      return item.surface
    })

    if (surfaces.length === 0) {
      syncWillChange(false)
      return
    }

    gsap.killTweensOf(surfaces)

    settleTween = gsap.to(surfaces, {
      y: 0,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      duration: FOLLOW_SETTLE,
      ease: 'power3.out',
      stagger: { amount: SETTLE_STAGGER, from: 'start' },
      onComplete() {
        rest(surfaces)
        syncWillChange(false)
        settleTween = null
      }
    })
  }

  function onFrame(ts: number) {
    raf = 0
    if (isDragging) return

    const dt = Math.max(1, ts - lastTs)
    const top = scroller.scrollTop
    const delta = top - lastTop
    const instant = (delta / dt) * 16
    velocity = velocity * 0.68 + instant * 0.32
    lastTop = top
    lastTs = ts

    if (isScrolling || Math.abs(velocity) >= VELOCITY_IDLE) {
      syncWillChange(true)
      follow()
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
    if (isDragging) return
    hasScrolled = true
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
    for (const el of tracked) {
      const tile = cache.get(el)
      if (!tile) {
        syncTile(el)
        continue
      }
      syncGeometry(tile, el, scroller)
    }
    ScrollTrigger.refresh()
  }

  function killBatch() {
    for (const trigger of triggers) {
      trigger.kill()
    }
    triggers = []
  }

  function bindBatch(fresh?: Set<HTMLElement>) {
    killBatch()
    if (tracked.length === 0) return

    const surfaces = tracked.map(findSurface)

    if (!canMotion) {
      rest(surfaces)
      return
    }

    // 仅对新入场节点设初始隐态，避免 track 重绑时整表闪一下
    if (fresh && fresh.size > 0) {
      const nextSurfaces: HTMLElement[] = []
      for (const el of fresh) {
        nextSurfaces.push(findSurface(el))
      }
      gsap.set(nextSurfaces, { autoAlpha: 0, y: ENTER_Y, scaleX: 0.96, scaleY: 0.96 })
    }

    triggers = ScrollTrigger.batch(tracked, {
      scroller,
      start: BATCH_START,
      end: BATCH_END,
      interval: BATCH_INTERVAL,
      batchMax: BATCH_MAX,
      onRefreshInit() {
        return gsap.set(surfaces, { y: 0 })
      },
      onEnter(batch) {
        enter(batch as HTMLElement[], ENTER_Y)
      },
      onEnterBack(batch) {
        enter(batch as HTMLElement[], -ENTER_Y)
      },
      onLeave(batch) {
        hide(batch as HTMLElement[], -ENTER_Y)
      },
      onLeaveBack(batch) {
        hide(batch as HTMLElement[], ENTER_Y)
      }
    })
  }

  function mount() {
    media?.revert()
    media = gsap.matchMedia()

    media.add(
      {
        reduceMotion: '(prefers-reduced-motion: reduce)',
        canMotion: '(prefers-reduced-motion: no-preference)'
      },
      function (context) {
        canMotion = Boolean(context.conditions?.canMotion)
        bindBatch(new Set(tracked))

        if (!canMotion) {
          return function () {
            killBatch()
          }
        }

        scroller.addEventListener('scroll', onScroll, { passive: true })
        window.addEventListener('resize', onResize, { passive: true })

        return function () {
          scroller.removeEventListener('scroll', onScroll)
          window.removeEventListener('resize', onResize)
          if (raf) cancelAnimationFrame(raf)
          raf = 0
          if (idleTimer) window.clearTimeout(idleTimer)
          idleTimer = 0
          settleTween?.kill()
          settleTween = null
          killBatch()
        }
      }
    )
  }

  mount()

  return {
    track(tiles) {
      // 拖拽中由 hook 静默 observer；此处再挡一层，避免误 sync
      if (isDragging) {
        tracked = tiles
        for (const el of tiles) syncTile(el)
        return
      }

      const prev = new Set(tracked)
      const next = new Set(tiles)
      const fresh = new Set<HTMLElement>()

      for (const el of tracked) {
        if (!next.has(el)) cache.delete(el)
      }
      for (const el of tiles) {
        if (!prev.has(el)) fresh.add(el)
        syncTile(el)
      }

      // 同集合仅换序：syncTile 已更新几何，勿 killBatch
      const isSameMembership = fresh.size === 0 && prev.size === next.size
      tracked = tiles

      if (isSameMembership) {
        ScrollTrigger.refresh()
        return
      }

      bindBatch(fresh)
      ScrollTrigger.refresh()
    },
    pause() {
      if (isDragging) return
      isDragging = true
      isScrolling = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
      if (idleTimer) {
        window.clearTimeout(idleTimer)
        idleTimer = 0
      }
      reset()
      for (const el of tracked) clearFx(el)
    },
    resume() {
      // refresh / track 交给 hook.resume 单次 syncTrack，避免连刷
      isDragging = false
      lastTop = scroller.scrollTop
      velocity = 0
      isScrolling = false
      for (const el of tracked) syncTile(el)
    },
    destroy() {
      isDragging = true
      if (raf) cancelAnimationFrame(raf)
      if (idleTimer) window.clearTimeout(idleTimer)
      settleTween?.kill()
      reset()
      killBatch()
      media?.revert()
      media = null
      cache.clear()
      tracked = []
    }
  }
}

export { bindScrollFx, clearFx, clearGhost, TILE }
export type { ScrollFx }
