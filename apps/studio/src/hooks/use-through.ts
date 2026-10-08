import { useEffect, type RefObject } from 'react'

const HIT_SELECTOR = "[data-region='false']"

type ThroughRect = { x: number; y: number; w: number; h: number }

interface ThroughOptions {
  rootRef: RefObject<HTMLElement | null>
  enabled?: boolean
}

function parseRect(el: Element): ThroughRect | null {
  const box = el.getBoundingClientRect()
  if (box.width <= 0 || box.height <= 0) return null
  return {
    x: Math.round(box.left),
    y: Math.round(box.top),
    w: Math.round(box.width),
    h: Math.round(box.height)
  }
}

function findHitRects(root: HTMLElement): ThroughRect[] {
  const rects: ThroughRect[] = []
  const seen = new Set<Element>()

  function push(el: Element) {
    if (seen.has(el)) return
    seen.add(el)
    const rect = parseRect(el)
    if (rect) rects.push(rect)
  }

  if (root.matches(HIT_SELECTOR)) push(root)
  const nodes = root.querySelectorAll(HIT_SELECTOR)
  for (const node of nodes) push(node)

  return rects
}

function clearSource(source: string) {
  void window.itc.through.updateRects({ source, rects: [] }).catch(function () {})
}

function publishRects(source: string, rects: ThroughRect[]) {
  void window.itc.through.updateRects({ source, rects }).catch(function () {})
}

/**
 * 上报 `[data-region='false']` 的 hit-rects 给 through worker。
 * 只有 false 是互动区（不穿透）；`true` / 无标记都不进 hit，整窗其余区域点透到桌面。
 * `enabled=false` 时清空该 source。
 */
function useThrough(source: string, options: ThroughOptions) {
  const { rootRef, enabled = true } = options

  useEffect(
    function () {
      if (!enabled) {
        clearSource(source)
        return
      }

      const root = rootRef.current
      if (!root) return

      let frame = 0

      function sync() {
        cancelAnimationFrame(frame)
        frame = requestAnimationFrame(function () {
          const el = rootRef.current
          if (!el) return
          publishRects(source, findHitRects(el))
        })
      }

      sync()

      const resize = new ResizeObserver(sync)
      resize.observe(root)
      const mutation = new MutationObserver(sync)
      mutation.observe(root, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['data-region', 'style', 'class']
      })

      window.addEventListener('resize', sync)

      return function () {
        cancelAnimationFrame(frame)
        resize.disconnect()
        mutation.disconnect()
        window.removeEventListener('resize', sync)
        clearSource(source)
      }
    },
    [enabled, rootRef, source]
  )
}

export { useThrough }
export type { ThroughRect }
