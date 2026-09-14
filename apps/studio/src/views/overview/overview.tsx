import { clsx } from 'clsx'
import { useState } from 'react'

import ReSignIn from '@/features/signin/signin.tsx'
import { Combination } from '@/views/overview/components/index'

import styles from '@/views/overview/overview.module.scss'

export default function Overview() {
  const [visible, onUpdateVisible] = useState(false)

  return (
    <div className={clsx(styles.overview)}>
      <Combination.Utility />
      <Combination.Section />
      <Combination.Summary />
      <ReSignIn
        visible={visible}
        onClose={function () {
          onUpdateVisible(false)
        }}
      />
    </div>
  )
}
