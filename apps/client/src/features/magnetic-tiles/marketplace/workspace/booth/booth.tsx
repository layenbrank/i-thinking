import { useContext } from 'react'
import { clsx } from 'clsx'

import { FEATURE_BUCKETS } from '@/constants/feature-buckets'
import { Bucket } from '@/features/magnetic-tiles/marketplace/workspace/bucket'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/booth/section.tsx'
import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'

import styles from '@/features/magnetic-tiles/marketplace/workspace/booth/booth.module.scss'

export default function Booth() {
  const { featureBucket, onUpdateFeatureBucket } = useContext(MarketplaceContext)

  return (
    <div className={clsx(styles.booth)}>
      <div className={clsx(styles.workspace)}>
        <Bucket
          value={featureBucket}
          options={FEATURE_BUCKETS}
          onUpdate={onUpdateFeatureBucket}
        />
        <ReSection bucket={featureBucket} />
      </div>
    </div>
  )
}
