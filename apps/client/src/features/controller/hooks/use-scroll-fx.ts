import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type RefObject, useLayoutEffect, useMemo, useRef } from 'react'

import { bindScrollFx, TILE_SELECTOR, type ScrollFx } from '@/features/controller/lib/scroll-fx'

gsap.registerPlugin(useGSAP)

type ScrollFxControls = {
  pause(): void
  resume(): void
}

function findScroller(grid: HTMLElement): HTMLElement {
  return (grid.closest('[data-mirror-scroller]') as HTMLElement | null) ?? grid
}

function findTiles(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TILE_SELECTOR))
}

function syncTrack(fx: ScrollFx, grid: HTMLElement) {
  fx.track(findTiles(grid))
}

/**
 * 一次绑定 scroller；tilesKey / DOM 变化时仅 track 入场。
 * 拖拽 pause 时断开 MutationObserver。
 * Mutation 合并用 microtask（同帧），避免 rAF 跨帧造成 FOUC。
 */
function useScrollFx(
  gridRef: RefObject<HTMLElement | null>,
  tilesKey: string
): ScrollFxControls {
  const fxRef = useRef<ScrollFx | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const microtaskQueuedRef = useRef(false)
  const isPausedRef = useRef(false)

  function observeGrid(grid: HTMLElement) {
    observerRef.current?.disconnect()

    const observer = new MutationObserver(function () {
      if (isPausedRef.current) return
      if (microtaskQueuedRef.current) return
      microtaskQueuedRef.current = true

      // 同帧合并多次 mutation；先于 paint 的 microtask 内同步 track/hide
      queueMicrotask(function () {
        microtaskQueuedRef.current = false
        if (isPausedRef.current || !fxRef.current || !gridRef.current) return
        syncTrack(fxRef.current, gridRef.current)
      })
    })

    observer.observe(grid, { childList: true })
    observerRef.current = observer
  }

  useGSAP(
    function () {
      const grid = gridRef.current
      if (!grid) return

      const fx = bindScrollFx(findScroller(grid))
      fxRef.current = fx
      syncTrack(fx, grid)

      return function () {
        observerRef.current?.disconnect()
        observerRef.current = null
        microtaskQueuedRef.current = false
        fx.destroy()
        fxRef.current = null
      }
    },
    { scope: gridRef }
  )

  useLayoutEffect(
    function () {
      const grid = gridRef.current
      const fx = fxRef.current
      if (!grid || !fx) return

      if (!isPausedRef.current) {
        syncTrack(fx, grid)
        observeGrid(grid)
      }

      return function () {
        observerRef.current?.disconnect()
        observerRef.current = null
        microtaskQueuedRef.current = false
      }
    },
    [gridRef, tilesKey]
  )

  return useMemo(
    function (): ScrollFxControls {
      return {
        pause() {
          isPausedRef.current = true
          observerRef.current?.disconnect()
          microtaskQueuedRef.current = false
          fxRef.current?.pause()
        },
        resume() {
          if (!isPausedRef.current) return
          isPausedRef.current = false
          fxRef.current?.resume()
          const grid = gridRef.current
          const fx = fxRef.current
          if (!grid || !fx) return
          syncTrack(fx, grid)
          observeGrid(grid)
        }
      }
    },
    [gridRef]
  )
}

export { useScrollFx }
export type { ScrollFxControls }
