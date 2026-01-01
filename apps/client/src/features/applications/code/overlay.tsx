import { clsx } from 'clsx'

import {
  Application,
  OverlayContext
} from '@/features/application/application.tsx'
import styles from '@/features/applications/code/overlay.module.scss'
// import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

// interface Props {}

export default function Overlay() {
  const { visible, onUpdateVisible } = useContext(OverlayContext)


  const monacoEl = useRef(null)



  return (
    <Application.Overlay
      open={visible}
      className={clsx([styles.overlay, styles.root])}
      onOk={() => onUpdateVisible(false)}
      onCancel={() => onUpdateVisible(false)}>
        <div
          className={styles.overlay}
          ref={monacoEl}>
          Overlay
        </div>
    </Application.Overlay>
  )
}
