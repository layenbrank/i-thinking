import { Suspense, lazy, useCallback, useState } from 'react'

import {
  MarketplaceProvider,
  type MarketplacePage
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import { MarketplacePageSkeleton } from '@/features/magnetic-tiles/marketplace/workspace/skeleton'

const Booth = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/booth/booth')
})
const NavigatePage = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/navigate/navigate')
})
const Customize = lazy(function () {
  return import('@/features/magnetic-tiles/marketplace/workspace/customize/customize')
})

const PAGE_VIEWS: Record<MarketplacePage, typeof Booth> = {
  booth: Booth,
  navigate: NavigatePage,
  customize: Customize
}

export default function Workspace() {
  const [page, onUpdatePageState] = useState<MarketplacePage>('booth')

  const onUpdatePage = useCallback(function (next: MarketplacePage) {
    onUpdatePageState(next)
  }, [])

  const View = PAGE_VIEWS[page]

  return (
    <MarketplaceProvider
      page={page}
      onUpdatePage={onUpdatePage}>
      <Suspense fallback={<MarketplacePageSkeleton />}>
        <View />
      </Suspense>
    </MarketplaceProvider>
  )
}
