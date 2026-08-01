import { useContext } from 'react'
import { clsx } from 'clsx'

import { NAVIGATE_BUCKETS } from '@/constants/navigate-buckets'
import { Bucket } from '@/features/magnetic-tiles/marketplace/workspace/bucket'
import { MarketplaceContext } from '@/features/magnetic-tiles/marketplace/workspace/context'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/navigate/section.tsx'

import styles from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigate.module.scss'

export default function Navigate() {
  const { navigateBucket, onUpdateNavigateBucket } = useContext(MarketplaceContext)

  return (
    <div className={clsx(styles.navigate)}>
      <div className={clsx(styles.workspace)}>
        <Bucket
          value={navigateBucket}
          options={NAVIGATE_BUCKETS}
          onUpdate={onUpdateNavigateBucket}
        />
        <ReSection bucket={navigateBucket} />
      </div>
    </div>
  )
}
