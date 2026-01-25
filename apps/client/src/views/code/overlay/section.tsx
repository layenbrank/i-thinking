import { clsx } from 'clsx'

import styles from '@/views/code/overlay/section.module.scss'

export default function Section() {
  return (
    <div
      id="monacoGraph"
      className={clsx([styles.section, styles.root])}
    />
  )
}
