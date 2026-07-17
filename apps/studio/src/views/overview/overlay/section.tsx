import { clsx } from 'clsx'

import styles from '@/views/overview/overlay/section.module.scss'

interface SectionProps {}

function Section(props: SectionProps) {
  return <div className={clsx([styles.section, styles.root])}></div>
}

export default Section
