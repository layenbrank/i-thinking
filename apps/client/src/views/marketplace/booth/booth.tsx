import { Divider } from 'antd'
import { clsx } from 'clsx'

import ReNavigation from '@/views/marketplace/booth/navigation.tsx'
import ReSection from '@/views/marketplace/booth/section.tsx'
import ReSummary from '@/views/marketplace/booth/summary.tsx'
import ReUtility from '@/views/marketplace/booth/utility.tsx'

import styles from '@/views/marketplace/marketplace.module.scss'

export default function Booth() {
  return (
    <>
      <ReUtility />
      <Divider
        size="small"
        style={{ marginBlock: '0px' }}
      />
      <ReSummary />
      <Divider
        size="small"
        style={{ marginBlock: '0px' }}
      />
      <div className={clsx([styles.marketplace, styles.wrapper])}>
        <ReNavigation />
        <ReSection />
      </div>
    </>
  )
}
