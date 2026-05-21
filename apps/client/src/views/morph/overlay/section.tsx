import { clsx } from 'clsx'

import Canvas from '@/views/morph/overlay/components/canvas.tsx'
import Toolbar from '@/views/morph/overlay/components/toolbar.tsx'
import styles from '@/views/morph/overlay/section.module.scss'

export function Section() {
  return (
    <div className={clsx([styles.section, styles.root])}>
      <Toolbar />
      <Canvas />
    </div>
  )
}

export default Section
