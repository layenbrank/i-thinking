import { clsx } from 'clsx'

import styles from '@/views/markdown/overlay/summary.module.scss'

export default function Summary() {
  return (
    <div className={clsx([styles.summary, styles.root])}>Summary Overlay</div>
  )
}
