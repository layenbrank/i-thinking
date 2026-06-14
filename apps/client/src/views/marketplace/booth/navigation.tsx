import { clsx } from 'clsx'
import { Segmented } from 'antd'
// import { Icon } from '@iconify/react'

import { OPTIONS } from '@/constants/mirror.ts'

import styles from '@/views/marketplace/booth/navigation.module.scss'
// interface NavigationProps {
// }

export default function Navigation() {
  return (
    <div className={clsx(styles.navigation)}>
      <Segmented
        options={OPTIONS}
        orientation="vertical"
        rootClassName={styles.segmented}
      />
    </div>
  )
}
