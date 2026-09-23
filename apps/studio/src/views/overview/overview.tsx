import { clsx } from 'clsx'
import { useState } from 'react'

import ReSignIn from '@/features/signin/signin.tsx'
import OverviewUtility from '@/views/overview/components/utility'
import { EngineSearch } from '@/views/overview/engine/search'
import Stage from '@/views/stage/stage.tsx'

import styles from '@/views/overview/overview.module.scss'

export default function Overview() {
  const [visible, onUpdateVisible] = useState(false)

  return (
    <div className={clsx(styles.overview)}>
      <OverviewUtility
        onOpenSignIn={function () {
          onUpdateVisible(true)
        }}
      />
      <div className={styles.prefix}>
        <EngineSearch />
      </div>
      <Stage isPadded />
      <ReSignIn
        visible={visible}
        onClose={function () {
          onUpdateVisible(false)
        }}
      />
    </div>
  )
}
