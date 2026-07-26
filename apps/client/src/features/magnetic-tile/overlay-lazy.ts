import { useRef } from 'react'

import type { Cache } from '@/features/magnetic-tile/magnetic-tile.tsx'

function useOverlayLazy(visible: boolean, cache: Cache) {
  const hasOpenedRef = useRef(false)

  if (visible) {
    hasOpenedRef.current = true
  }

  if (cache === 'destroy') {
    return visible
  }

  return visible || hasOpenedRef.current
}

export { useOverlayLazy }
