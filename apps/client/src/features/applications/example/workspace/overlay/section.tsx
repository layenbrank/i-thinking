import { clsx } from 'clsx'

import styles from '@/features/applications/example/workspace/overlay/section.module.scss'

// interface SectionProps {
// }

export function Section() {
  return <div className={clsx([styles.section, styles.root])} />
}

export default Section
