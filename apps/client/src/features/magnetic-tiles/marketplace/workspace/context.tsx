import { createContext, useMemo, useState, type ReactNode } from 'react'

import type { FeatureBucket } from '@/constants/feature-buckets'
import type { NavigateBucket } from '@/constants/navigate-buckets'

type MarketplaceMode = 'booth' | 'navigate' | 'customize'

interface MarketplaceContextProps {
  mode: MarketplaceMode
  onUpdateMode: (mode: MarketplaceMode) => void
  featureBucket: FeatureBucket
  onUpdateFeatureBucket: (bucket: FeatureBucket) => void
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
  featureBucket: 'all',
  onUpdateFeatureBucket: function () {},
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
  const [featureBucket, onUpdateFeatureBucket] = useState<FeatureBucket>('all')
  const [navigateBucket, onUpdateNavigateBucket] = useState<NavigateBucket>('all')
  const [query, onUpdateQuery] = useState('')
  const [targetMirrorID, onUpdateTargetMirrorID] = useState<string | undefined>(undefined)

  const value = useMemo(
    function () {
      return {
        mode: props.mode,
        onUpdateMode: props.onUpdateMode,
        featureBucket,
        onUpdateFeatureBucket,
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
      featureBucket,
      navigateBucket,
      query,
      targetMirrorID
    ]
  )

  return <MarketplaceContext value={value}>{props.children}</MarketplaceContext>
}

export { MarketplaceContext, MarketplaceProvider }
export type { MarketplaceMode }
