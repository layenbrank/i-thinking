import { useContext } from 'react'
import { clsx } from 'clsx'

import { BOOTH_BUCKETS } from '@/constants/marketplace/buckets'
import { Bucket } from '@/features/magnetic-tiles/marketplace/workspace/bucket'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/booth/section.tsx'
import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'

import styles from '@/features/magnetic-tiles/marketplace/workspace/booth/booth.module.scss'

export default function Booth() {
  const { boothBucket, onUpdateBoothBucket } = useContext(MarketplaceContext)

  return (
    <div className={clsx(styles.booth)}>
      <div className={clsx(styles.workspace)}>
        <Bucket
          value={boothBucket}
          options={BOOTH_BUCKETS}
          onUpdate={onUpdateBoothBucket}
        />
        <ReSection bucket={boothBucket} />
      </div>
    </div>
  )
}
