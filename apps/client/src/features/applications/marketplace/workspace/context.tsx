import { createContext, type ReactNode } from 'react'

type MarketplacePage = 'booth' | 'navigate' | 'customize'

interface MarketplaceContextProps {
  page: MarketplacePage
  onUpdatePage: (page: MarketplacePage) => void
}

const MarketplaceContext = createContext<MarketplaceContextProps>({
  page: 'booth',
  onUpdatePage: function () {}
})

interface MarketplaceProviderProps {
  children: ReactNode
  page: MarketplacePage
  onUpdatePage: (page: MarketplacePage) => void
}

function MarketplaceProvider(props: MarketplaceProviderProps) {
  const value = useMemo(
    function () {
      return {
        page: props.page,
        onUpdatePage: props.onUpdatePage
      }
    },
    [props.page, props.onUpdatePage]
  )

  return <MarketplaceContext value={value}>{props.children}</MarketplaceContext>
}

export { MarketplaceContext, MarketplaceProvider }
export type { MarketplacePage }
