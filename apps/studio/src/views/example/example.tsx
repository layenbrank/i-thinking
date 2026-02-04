import { clsx } from 'clsx'

import { Overlay } from '@/views/example/overlay/index.ts'

import styles from '@/views/example/example.module.scss'

export default function Example() {
  return (
    <div className={clsx([styles.example])}>
      <Overlay.Utility />
      <Overlay.Section />
    </div>
  )
}
