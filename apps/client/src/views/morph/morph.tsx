import { Spinner } from '@i-thinking/design/components/spinner'
import { Suspense, lazy } from 'react'

import { WindowFrame } from '@/components/window-frame/index.ts'
import { Caption } from '@/views/morph/workspace/caption.tsx'
import styles from '@/views/morph/morph.module.scss'

const MorphWorkspace = lazy(function () {
  return import('@/views/morph/workspace/workspace.tsx')
})

export default function Morph() {
  return (
    <WindowFrame
      start={<Caption />}
      isScrollable={false}>
      <Suspense
        fallback={
          <div className={styles.root}>
            <Spinner className="size-5 text-muted-foreground" />
          </div>
        }>
        <MorphWorkspace />
      </Suspense>
    </WindowFrame>
  )
}
