import { clsx } from 'clsx'

import Controller from '@/features/controller/controller.tsx'

import styles from '@/views/overview/components/section.module.scss'

function Section() {
  return (
    <main className={clsx(styles.section)}>
      <Controller.Mirror>
        <Controller.MagneticTile />
      </Controller.Mirror>
    </main>
  )
}

export default Section
