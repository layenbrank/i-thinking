import { clsx } from 'clsx'

import styles from '@/features/applications/markdown/workspace/overlay/summary.module.scss'

export default function Summary() {
  return (
    <div className={clsx([styles.summary, styles.root])}>Summary Overlay</div>
  )
}
