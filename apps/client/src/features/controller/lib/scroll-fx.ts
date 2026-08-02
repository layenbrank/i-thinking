/**
 * Mirror 滚动动效 + 磁贴入场
 *
 * 滚动：仿 ScrollSmoother 的「长尾追赶」——Observer 拦 wheel，累积 target，
 *   再用 gsap.quickTo(scrollTop, expo.out ~1.25s) 缓到目标。
 *   不用 ScrollSmoother 本体（会 position:fixed，嵌套 Mirror 会毁布局）。
 *   quickTo 专为连续改目标设计，避免每次 gsap.to 重开整段导致的发粘。
 *
 * 入场：gsap.from(surface) stagger 一次；位移不打根节点，避免干扰 Sortable。
 */
import gsap from 'gsap'
import { Observer } from 'gsap/Observer'

gsap.registerPlugin(Observer)

/** 实体磁贴（排除 Suspense 骨架） */
const TILE_SELECTOR = '.magnetic-tile:not(.magnetic-tile-skeleton)'
const SURFACE_SELECTOR = '.magnetic-tile-surface'
/** 入场完成标记：配合 CSS 默认 opacity:0，clearProps 后仍可见 */
const ENTERED_CLASS = 'magnetic-tile-entered'

const ENTER_DURATION = 0.75
const ENTER_Y = -36
const ENTER_SCALE = 0.5
const ENTER_STAGGER = 0.04
const ENTER_EASE = 'back.out'

/**
 * 追赶时长 / 缓动：对齐 ScrollSmoother 默认 `smooth≈0.8` + ease expo。
 * 短 lerp（~0.25s）肉眼接近原生；要「丝滑」必须把尾巴拉长到 1s+。
 */
const SMOOTH_DURATION = 1.25
const SMOOTH_EASE = 'expo.out'

const CLEAR_SURFACE_PROPS = 'transform,opacity,visibility'

type ScrollFx = {
  track(tiles: HTMLElement[]): void
  pause(): void
  resume(): void
  /** 停阻尼并滚回顶部（切页用） */
  reset(): void
  destroy(): void
}

/** scroller → 存活实例，供 resetMirrorScroll 停掉阻尼 */
const ACTIVE = new WeakMap<HTMLElement, ScrollFx>()

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function findSurface(tile: HTMLElement): HTMLElement {
  return (tile.querySelector(SURFACE_SELECTOR) as HTMLElement | null) ?? tile
}

function clearGhost(ghost: HTMLElement | null) {
  if (!ghost) return
  const surface = findSurface(ghost)
  gsap.killTweensOf(ghost)
  gsap.killTweensOf(surface)
  gsap.set(surface, { clearProps: CLEAR_SURFACE_PROPS })
}

function clearFx(tile: HTMLElement) {
  const surface = findSurface(tile)
  gsap.killTweensOf(tile)
  gsap.killTweensOf(surface)
  gsap.set(surface, { clearProps: CLEAR_SURFACE_PROPS })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function findScrollMax(scroller: HTMLElement) {
  return Math.max(0, scroller.scrollHeight - scroller.clientHeight)
}

function bindScrollFx(scroller: HTMLElement): ScrollFx {
  ACTIVE.get(scroller)?.destroy()

  const played = new WeakSet<HTMLElement>()
  let tracked: HTMLElement[] = []
  let isDragging = false
  const canMotion = !prefersReducedMotion()

  let target = scroller.scrollTop
  let observer: Observer | null = null

  const scrollTo = canMotion
    ? gsap.quickTo(scroller, 'scrollTop', {
        duration: SMOOTH_DURATION,
        ease: SMOOTH_EASE
      })
    : null

  function stopDamp() {
    gsap.killTweensOf(scroller)
  }

  function syncFromDom() {
    target = scroller.scrollTop
  }

  function nudgeBy(delta: number) {
    const max = findScrollMax(scroller)
    if (max <= 0 || !scrollTo) return false

    // 未在补间时对齐（例如刚拖过滚动条）
    if (!gsap.isTweening(scroller)) syncFromDom()

    target = clamp(target + delta, 0, max)
    scrollTo(target)
    return true
  }

  function onScroll() {
    if (isDragging || gsap.isTweening(scroller)) return
    syncFromDom()
  }

  function markEntered(tiles: HTMLElement[]) {
    for (const el of tiles) el.classList.add(ENTERED_CLASS)
  }

  function playEnter(tiles: HTMLElement[]) {
    if (tiles.length === 0 || isDragging) return

    const pending: HTMLElement[] = []
    for (const el of tiles) {
      if (played.has(el)) continue
      const surface = findSurface(el)
      if (gsap.isTweening(el) || gsap.isTweening(surface)) {
        played.add(el)
        el.classList.add(ENTERED_CLASS)
        continue
      }
      played.add(el)
      pending.push(el)
    }
    if (pending.length === 0) return

    // 尽早打标：中断 clearProps 后靠 CSS .magnetic-tile-entered 保持可见
    markEntered(pending)

    if (!canMotion) {
      for (const el of pending) {
        gsap.set(findSurface(el), { clearProps: CLEAR_SURFACE_PROPS })
      }
      return
    }

    const surfaces = pending.map(findSurface)
    gsap.killTweensOf(surfaces)
    // 同步藏起，赶在本帧 paint 前，避免先亮后藏的 FOUC
    gsap.set(surfaces, {
      opacity: 0,
      y: ENTER_Y,
      scale: ENTER_SCALE
    })
    gsap.to(surfaces, {
      duration: ENTER_DURATION,
      opacity: 1,
      y: 0,
      scale: 1,
      stagger: ENTER_STAGGER,
      ease: ENTER_EASE,
      overwrite: true,
      onComplete() {
        gsap.set(surfaces, { clearProps: CLEAR_SURFACE_PROPS })
      }
    })
  }

  if (canMotion) {
    observer = Observer.create({
      target: scroller,
      type: 'wheel',
      preventDefault: true,
      onChangeY(self) {
        if (isDragging) return
        nudgeBy(self.deltaY)
      }
    })
    scroller.addEventListener('scroll', onScroll, { passive: true })
  }

  const fx: ScrollFx = {
    track(tiles) {
      if (isDragging) {
        tracked = tiles
        return
      }

      const fresh: HTMLElement[] = []
      for (const el of tiles) {
        if (!played.has(el)) fresh.push(el)
      }
      tracked = tiles
      playEnter(fresh)
    },
    pause() {
      if (isDragging) return
      isDragging = true
      stopDamp()
      syncFromDom()
      observer?.disable()
      for (const el of tracked) clearFx(el)
    },
    resume() {
      if (!isDragging) return
      isDragging = false
      syncFromDom()
      observer?.enable()
    },
    reset() {
      stopDamp()
      scroller.scrollTop = 0
      target = 0
    },
    destroy() {
      isDragging = true
      stopDamp()
      ACTIVE.delete(scroller)
      observer?.kill()
      observer = null
      scroller.removeEventListener('scroll', onScroll)
      for (const el of tracked) clearFx(el)
      tracked = []
    }
  }

  ACTIVE.set(scroller, fx)
  return fx
}

/** 切页归零滚动（停掉阻尼） */
function resetMirrorScroll(scroller: HTMLElement | null) {
  if (!scroller) return
  const fx = ACTIVE.get(scroller)
  if (fx) {
    fx.reset()
    return
  }
  scroller.scrollTop = 0
}

export { bindScrollFx, clearFx, clearGhost, resetMirrorScroll, TILE_SELECTOR }
export type { ScrollFx }
