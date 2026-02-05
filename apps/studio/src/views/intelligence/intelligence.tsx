import { clsx } from 'clsx'

import { Overlay } from '@/views/intelligence/overlay/index.ts'

import styles from '@/views/intelligence/intelligence.module.scss'

export default function intelligence() {
  return (
    <div className={clsx([styles.intelligence])}>
      <Overlay.Utility />
      <Overlay.Navigation />
      <Overlay.Section />
      <Overlay.Thought />
    </div>
  )
}
