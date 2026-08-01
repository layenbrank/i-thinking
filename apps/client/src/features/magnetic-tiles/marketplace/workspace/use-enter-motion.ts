import { type RefObject, useLayoutEffect } from 'react'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

import { bindEnterMotion } from '@/features/magnetic-tiles/marketplace/workspace/enter-motion'

/**
 * 滚动容器绑定列表进场。
 * rebuildKey 变化时重建；layoutKey 仅顺序变化时 refresh。
 */
function useEnterMotion(
  scrollerRef: RefObject<Element | null>,
  rebuildKey: string,
  layoutKey?: string
) {
  useLayoutEffect(
    function () {
      const scroller = scrollerRef.current
      if (!scroller) return

      const motion = bindEnterMotion(scroller)
      return function () {
        motion.destroy()
      }
    },
    [scrollerRef, rebuildKey]
  )

  useLayoutEffect(
    function () {
      if (layoutKey === undefined) return
      ScrollTrigger.refresh()
    },
    [layoutKey]
  )
}

export { useEnterMotion }
