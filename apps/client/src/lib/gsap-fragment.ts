/**
 * Overview 搜索列表 GSAP 能力（插件单例注册，可复用）
 * 鼠标滚轮走原生滚动（避免 Observer + tween 跟手延迟/卡顿）
 * 键盘定位仍用 scrollTo 平滑对齐
 */
import gsap from 'gsap'
import { ScrollToPlugin } from 'gsap/ScrollToPlugin'

let isRegistered = false

const INDICATOR_DURATION = 0.2
const KEYBOARD_SCROLL_DURATION = 0.28

function ensurePlugins() {
  if (isRegistered) return
  gsap.registerPlugin(ScrollToPlugin)
  isRegistered = true
}

function hasReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function clampScrollTop(container: HTMLElement, scrollTop: number) {
  const max = Math.max(0, container.scrollHeight - container.clientHeight)
  return Math.max(0, Math.min(scrollTop, max))
}

type ScrollToOptions = {
  duration?: number
  onComplete?: () => void
}

type FragmentScrollSession = {
  scrollTo: (scrollTop: number, options?: number | ScrollToOptions) => void
  refresh: () => void
  destroy: () => void
}

type BindFragmentScrollOptions = {
  /** @deprecated 滚轮已改原生，保留字段避免调用方破坏性变更 */
  wheelGain?: number
  onScrollTarget?: (scrollTop: number) => void
}

type IndicatorDriver = {
  sync: (item: HTMLElement, instant?: boolean) => void
  hide: () => void
  destroy: () => void
}

/**
 * 高亮条与行对齐：quickTo 跟手
 */
function createIndicatorDriver(indicator: HTMLElement): IndicatorDriver {
  ensurePlugins()

  const moveY = gsap.quickTo(indicator, 'y', {
    duration: INDICATOR_DURATION,
    ease: 'power2.out'
  })
  const moveH = gsap.quickTo(indicator, 'height', {
    duration: INDICATOR_DURATION,
    ease: 'power2.out'
  })

  function sync(item: HTMLElement, instant = false) {
    const y = item.offsetTop
    const height = item.offsetHeight

    gsap.set(indicator, { opacity: 1 })

    if (instant || hasReducedMotion()) {
      gsap.set(indicator, { y, height })
      return
    }

    moveY(y)
    moveH(height)
  }

  function hide() {
    gsap.set(indicator, { opacity: 0 })
  }

  return {
    sync,
    hide,
    destroy: function () {
      gsap.killTweensOf(indicator)
    }
  }
}

/**
 * 绑定列表滚动：滚轮原生；键盘/程序定位用 scrollTo
 * 入场 stagger 由 Motion 负责，滚动中不再做 opacity fromTo（避免与滚轮抢主线程）
 */
function bindFragmentScroll(
  container: HTMLElement,
  items: HTMLElement[],
  options: BindFragmentScrollOptions = {}
): FragmentScrollSession {
  ensurePlugins()

  function syncScrollTarget() {
    options.onScrollTarget?.(container.scrollTop)
  }

  function scrollTo(scrollTop: number, optionsOrDuration?: number | ScrollToOptions) {
    const parsed =
      typeof optionsOrDuration === 'number'
        ? { duration: optionsOrDuration }
        : (optionsOrDuration ?? {})
    const duration = parsed.duration ?? KEYBOARD_SCROLL_DURATION
    const onComplete = parsed.onComplete
    const next = clampScrollTop(container, scrollTop)
    options.onScrollTarget?.(next)

    if (hasReducedMotion()) {
      gsap.killTweensOf(container)
      container.scrollTop = next
      onComplete?.()
      return
    }

    gsap.to(container, {
      scrollTo: { y: next, autoKill: true },
      duration,
      ease: 'power2.out',
      overwrite: 'auto',
      onComplete: onComplete
    })
  }

  container.addEventListener('scroll', syncScrollTarget, { passive: true })

  // 清除可能残留的行内 opacity，交给 Motion / CSS
  items.forEach(function (item) {
    gsap.set(item, { clearProps: 'opacity' })
  })

  return {
    scrollTo: scrollTo,
    refresh: function () {
      items.forEach(function (item) {
        gsap.set(item, { clearProps: 'opacity' })
      })
    },
    destroy: function () {
      container.removeEventListener('scroll', syncScrollTarget)
      gsap.killTweensOf(container)
      items.forEach(function (item) {
        gsap.killTweensOf(item)
        gsap.set(item, { clearProps: 'opacity' })
      })
    }
  }
}

export {
  ensurePlugins,
  hasReducedMotion,
  clampScrollTop,
  bindFragmentScroll,
  createIndicatorDriver,
  INDICATOR_DURATION,
  KEYBOARD_SCROLL_DURATION as SCROLL_DURATION
}

export type { FragmentScrollSession, IndicatorDriver }
