import { clsx } from 'clsx'
import Controller from '@/features/controller/controller.tsx'

import styles from '@/views/overview/overlay/section.module.scss'

interface SectionProps {}

function Section(props: SectionProps) {
  return (
    <div className={clsx([styles.section, styles.root])}>
      <Controller.Mirror>
        <Controller.Application />
      </Controller.Mirror>
    </div>
  )
}

export default Section
