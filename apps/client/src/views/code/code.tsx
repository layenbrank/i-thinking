import { Suspense, lazy } from 'react'

import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'
import styles from '@/views/code/code.module.scss'

const CodeWorkspace = lazy(function () {
  return import('@/views/code/workspace/code.tsx')
})

export default function Code() {
  return (
    <WindowFrame
      title={findComponentLabel('code')}
      isScrollable={false}>
      <div className={styles.workspace}>
        <Suspense fallback={null}>
          <CodeWorkspace />
        </Suspense>
      </div>
    </WindowFrame>
  )
}
