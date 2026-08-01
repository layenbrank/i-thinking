import { Suspense, lazy, useContext } from 'react'

import {
  MarketplaceContext,
  type MarketplaceMode
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import { PageSkeleton } from '@/features/magnetic-tiles/marketplace/workspace/skeleton'

const Booth = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/booth/booth')
})
const Navigate = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/navigate/navigate')
})
const Customize = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/customize/customize')
})

const MODE_VIEWS: Record<MarketplaceMode, typeof Booth> = {
  booth: Booth,
  navigate: Navigate,
  customize: Customize
}

export default function Workspace() {
  const { mode } = useContext(MarketplaceContext)
  const View = MODE_VIEWS[mode]

  return (
    <Suspense fallback={<PageSkeleton />}>
      <View />
    </Suspense>
  )
}
