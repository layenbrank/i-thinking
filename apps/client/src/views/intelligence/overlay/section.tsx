import { clsx } from 'clsx'

import styles from '@/views/intelligence/overlay/section.module.scss'

// interface SectionProps {
// }

export default function Section() {
  return <div className={clsx([styles.section, styles.root])} />
}
