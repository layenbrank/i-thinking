import { clsx } from 'clsx'

import { Overlay } from '@/views/marketplace/overlay/index'

import styles from '@/views/marketplace/marketplace.module.scss'

export default function marketplace() {
  return (
    <div className={clsx([styles.marketplace, styles.root])}>
      <Overlay.Utility />
      <div className={clsx([styles.marketplace, styles.wrapper])}>
        <Overlay.Navigation />
        <Overlay.Section />
      </div>
      <Overlay.Summary />
    </div>
  )
}
