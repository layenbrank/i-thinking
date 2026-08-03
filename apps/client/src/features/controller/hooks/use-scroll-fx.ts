import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type RefObject, useMemo, useRef } from 'react'

import { bindScrollFx, type ScrollFx } from '@/features/controller/lib/scroll-fx'

gsap.registerPlugin(useGSAP)

type ScrollFxControls = {
  pause(): void
  resume(): void
}

function findScroller(grid: HTMLElement): HTMLElement {
  return (grid.closest('[data-mirror-scroller]') as HTMLElement | null) ?? grid
}

/**
 * 一次绑定 scroller 滚动阻尼；入场由 MagneticTile.Enter + Motion 负责。
 */
function useScrollFx(gridRef: RefObject<HTMLElement | null>): ScrollFxControls {
  const fxRef = useRef<ScrollFx | null>(null)

  useGSAP(
    function () {
      const grid = gridRef.current
      if (!grid) return

      const fx = bindScrollFx(findScroller(grid))
      fxRef.current = fx

      return function () {
        fx.destroy()
        fxRef.current = null
      }
    },
    { scope: gridRef }
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
