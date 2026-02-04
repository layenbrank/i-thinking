import { clsx } from 'clsx'

import { Overlay } from '@/views/overview/overlay/index.ts'

import styles from '@/views/overview/overview.module.scss'

export default function Overview() {
  return (
    <div className={clsx([styles.overview])}>
      <Overlay.Utility />
      <Overlay.Section />
    </div>
  )
}
