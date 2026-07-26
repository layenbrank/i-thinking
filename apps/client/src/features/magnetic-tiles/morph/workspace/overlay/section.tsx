import { clsx } from 'clsx'

import Canvas from '@/features/magnetic-tiles/morph/workspace/overlay/components/canvas.tsx'
import Toolbar from '@/features/magnetic-tiles/morph/workspace/overlay/components/toolbar.tsx'
import styles from '@/features/magnetic-tiles/morph/workspace/overlay/section.module.scss'

export function Section() {
  return (
    <div className={clsx([styles.section, styles.root])}>
      <Toolbar />
      <Canvas />
    </div>
  )
}

export default Section
