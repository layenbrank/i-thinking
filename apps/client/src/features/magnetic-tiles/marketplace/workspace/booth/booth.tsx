import { Divider } from 'antd'
import { clsx } from 'clsx'

import ReNavigation from '@/features/magnetic-tiles/marketplace/workspace/booth/navigation.tsx'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/booth/section.tsx'
import ReSummary from '@/features/magnetic-tiles/marketplace/workspace/booth/summary.tsx'

import styles from '@/features/magnetic-tiles/marketplace/workspace/booth/booth.module.scss'

export default function Booth() {
  return (
    <div className={clsx(styles.booth)}>
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
