import { Divider } from 'antd'
import { clsx } from 'clsx'

import ReNavigation from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigation.tsx'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/navigate/section.tsx'
import ReSummary from '@/features/magnetic-tiles/marketplace/workspace/navigate/summary.tsx'

import styles from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigate.module.scss'

export default function Navigate() {
  return (
    <div className={clsx(styles.navigate)}>
      <ReSummary />
      <Divider
        size="small"
        style={{ marginBlock: '0px' }}
      />
      <div className={clsx(styles.workspace)}>
        <ReNavigation />
        <ReSection />
      </div>
    </div>
  )
}
