import { Suspense, lazy, useContext } from 'react'

import {
  MarketplaceContext,
  type MarketplaceMode
} from '@/views/marketplace/workspace/context.tsx'
import { PageSkeleton } from '@/views/marketplace/workspace/skeleton.tsx'

const Booth = lazy(function () {
  return import('@/views/marketplace/workspace/booth/booth.tsx')
})
const Navigate = lazy(function () {
  return import('@/views/marketplace/workspace/navigate/navigate.tsx')
})
const Customize = lazy(function () {
  return import('@/views/marketplace/workspace/customize/customize.tsx')
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
