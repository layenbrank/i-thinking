import { clsx } from 'clsx'

import styles from '@/views/morph/overlay/section.module.scss'

// interface SectionProps {
// }

export function Section() {
  return <div className={clsx([styles.section, styles.root])} />
}

export default Section
