import { useCallback, useState } from 'react'

import {
  MarketplaceProvider,
  type MarketplacePage
} from '@/features/magnetic-tiles/marketplace/workspace/context'
import Booth from '@/features/magnetic-tiles/marketplace/workspace/booth/booth'
import NavigatePage from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigate'
import Customize from '@/features/magnetic-tiles/marketplace/workspace/customize/customize'

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
      <View />
    </MarketplaceProvider>
  )
}
