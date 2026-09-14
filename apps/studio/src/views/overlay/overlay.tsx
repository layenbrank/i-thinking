import { clsx } from 'clsx'

import { Combination } from '@/views/overlay/components/index'

import styles from '@/views/overlay/overlay.module.scss'

export default function Overlay() {
  return (
    <div className={clsx(styles.overlay)}>
      <Combination.Utility />
      <Combination.Section />
      <Combination.Summary />
    </div>
  )
}
