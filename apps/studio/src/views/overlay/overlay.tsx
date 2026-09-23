import { clsx } from 'clsx'

import { OverlayAction, ReloadAction } from '@/features/window/actions'
import { Utility } from '@/components/utility'
import Stage from '@/views/stage/stage.tsx'

import styles from '@/views/overlay/overlay.module.scss'

export default function Overlay() {
  return (
    <div className={clsx(styles.overlay)}>
      <Utility>
        <OverlayAction />
        <ReloadAction />
      </Utility>
      <Stage />
    </div>
  )
}
