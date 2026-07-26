import { Divider } from 'antd'
import { clsx } from 'clsx'

import ReNavigation from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigation.tsx'
import ReSection from '@/features/magnetic-tiles/marketplace/workspace/navigate/section.tsx'
import ReSummary from '@/features/magnetic-tiles/marketplace/workspace/navigate/summary.tsx'
import ReUtility from '@/features/utility/utility.tsx'

import styles from '@/features/magnetic-tiles/marketplace/workspace/navigate/navigate.module.scss'

export default function () {
  const [visible, onUpdateVisible] = useState(false)

  function onUpdateKeyword(keyword: string) {
    console.log('keyword', keyword)
  }

  return (
    <div className={clsx([styles.navigate])}>
      <ReUtility
        visible={visible}
        onUpdateVisible={onUpdateVisible}
        onUpdateKeyword={onUpdateKeyword}
      />
      <Divider
        size="small"
        style={{ marginBlock: '0px' }}
      />
      <ReSummary />
      <Divider
        size="small"
        style={{ marginBlock: '0px' }}
      />
      <div className={clsx([styles.workspace])}>
        <ReNavigation />
        <ReSection />
      </div>
    </div>
  )
}
