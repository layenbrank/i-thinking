import { clsx } from 'clsx'

import Canvas from '@/features/applications/morph/workspace/overlay/components/canvas.tsx'
import Toolbar from '@/features/applications/morph/workspace/overlay/components/toolbar.tsx'
import styles from '@/features/applications/morph/workspace/overlay/section.module.scss'

export function Section() {
  return (
    <div className={clsx([styles.section, styles.root])}>
      <Toolbar />
      <Canvas />
    </div>
  )
}

export default Section
