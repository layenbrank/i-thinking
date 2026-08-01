import { createContext, useMemo, useState, type ReactNode } from 'react'

import type { BoothBucket, NavigateBucket } from '@/constants/marketplace/buckets'

type MarketplaceMode = 'booth' | 'navigate' | 'customize'

interface MarketplaceContextProps {
  mode: MarketplaceMode
  onUpdateMode: (mode: MarketplaceMode) => void
  boothBucket: BoothBucket
  onUpdateBoothBucket: (bucket: BoothBucket) => void
  navigateBucket: NavigateBucket
  onUpdateNavigateBucket: (bucket: NavigateBucket) => void
  query: string
  onUpdateQuery: (query: string) => void
  targetMirrorID: string | undefined
  onUpdateTargetMirrorID: (mirrorID: string | undefined) => void
}

const MarketplaceContext = createContext<MarketplaceContextProps>({
  mode: 'booth',
  onUpdateMode: function () {},
  boothBucket: 'all',
  onUpdateBoothBucket: function () {},
  navigateBucket: 'all',
  onUpdateNavigateBucket: function () {},
  query: '',
  onUpdateQuery: function () {},
  targetMirrorID: undefined,
  onUpdateTargetMirrorID: function () {}
})

interface MarketplaceProviderProps {
  children: ReactNode
  mode: MarketplaceMode
  onUpdateMode: (mode: MarketplaceMode) => void
}

function MarketplaceProvider(props: MarketplaceProviderProps) {
  const [boothBucket, onUpdateBoothBucket] = useState<BoothBucket>('all')
  const [navigateBucket, onUpdateNavigateBucket] = useState<NavigateBucket>('all')
  const [query, onUpdateQuery] = useState('')
  const [targetMirrorID, onUpdateTargetMirrorID] = useState<string | undefined>(undefined)

  const value = useMemo(
    function () {
      return {
        mode: props.mode,
        onUpdateMode: props.onUpdateMode,
        boothBucket,
        onUpdateBoothBucket,
        navigateBucket,
        onUpdateNavigateBucket,
        query,
        onUpdateQuery,
        targetMirrorID,
        onUpdateTargetMirrorID
      }
    },
    [
      props.mode,
      props.onUpdateMode,
      boothBucket,
      navigateBucket,
      query,
      targetMirrorID
    ]
  )

  return <MarketplaceContext value={value}>{props.children}</MarketplaceContext>
}

export { MarketplaceContext, MarketplaceProvider }
export type { MarketplaceMode }
