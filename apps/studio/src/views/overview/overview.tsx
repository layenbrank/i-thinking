import { clsx } from 'clsx'
import { useState } from 'react'

import Controller from '@/features/controller/controller.tsx'
import ReSignIn from '@/features/signin/signin.tsx'
import OverviewUtility from '@/views/overview/components/utility'
import { EngineSearch } from '@/views/overview/engine/search'

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
      <main className={clsx(styles.stage, styles.padded)}>
        <Controller.Mirror>
          <Controller.MagneticTile />
        </Controller.Mirror>
      </main>
      <footer className={styles.foot} />
      <ReSignIn
        visible={visible}
        onClose={function () {
          onUpdateVisible(false)
        }}
      />
    </div>
  )
}
