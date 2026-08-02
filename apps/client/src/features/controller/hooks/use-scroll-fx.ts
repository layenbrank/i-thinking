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
 */
function useScrollFx(
  gridRef: RefObject<HTMLElement | null>,
  tilesKey: string
): ScrollFxControls {
  const fxRef = useRef<ScrollFx | null>(null)
  const observerRef = useRef<MutationObserver | null>(null)
  const frameRef = useRef(0)
  const isPausedRef = useRef(false)

  function observeGrid(grid: HTMLElement) {
    observerRef.current?.disconnect()

    const observer = new MutationObserver(function () {
      if (isPausedRef.current) return
      if (frameRef.current) return
      frameRef.current = requestAnimationFrame(function () {
        frameRef.current = 0
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
        if (frameRef.current) cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
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
        if (frameRef.current) cancelAnimationFrame(frameRef.current)
        frameRef.current = 0
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
          if (frameRef.current) {
            cancelAnimationFrame(frameRef.current)
            frameRef.current = 0
          }
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
