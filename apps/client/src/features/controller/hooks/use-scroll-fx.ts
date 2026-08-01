import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type RefObject, useMemo, useRef } from 'react'

import { bindScrollFx, TILE, type ScrollFx } from '@/features/controller/lib/scroll-fx'

gsap.registerPlugin(useGSAP)

type ScrollFxControls = {
  pause(): void
  resume(): void
}

function findScroller(grid: HTMLElement): HTMLElement {
  return (grid.closest('[data-mirror-scroller]') as HTMLElement | null) ?? grid
}

function findTiles(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(TILE))
}

/** 网格滚动特效：tilesKey 变化时重建；返回稳定的 pause / resume */
function useScrollFx(
  gridRef: RefObject<HTMLElement | null>,
  tilesKey: string
): ScrollFxControls {
  const fxRef = useRef<ScrollFx | null>(null)

  useGSAP(
    function () {
      const grid = gridRef.current
      if (!grid) return

      const fx = bindScrollFx(findScroller(grid))
      fxRef.current = fx
      fx.track(findTiles(grid))

      return function () {
        fx.destroy()
        fxRef.current = null
      }
    },
    {
      dependencies: [tilesKey],
      revertOnUpdate: true,
      scope: gridRef
    }
  )

  return useMemo(
    function (): ScrollFxControls {
      return {
        pause() {
          fxRef.current?.pause()
        },
        resume() {
          fxRef.current?.resume()
        }
      }
    },
    []
  )
}

export { useScrollFx }
export type { ScrollFxControls }
