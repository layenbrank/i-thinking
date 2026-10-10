import { Suspense, lazy } from 'react'

import { WindowFrame } from '@/components/window-frame/index.ts'
import { findComponentLabel } from '@/constants/marketplace/tile-hints'
import styles from '@/views/markdown/markdown.module.scss'

const MarkdownWorkspace = lazy(function () {
  return import('@/views/markdown/workspace/markdown.tsx')
})

export default function Markdown() {
  return (
    <WindowFrame
      title={findComponentLabel('markdown')}
      isScrollable={false}>
      <div className={styles.workspace}>
        <Suspense fallback={null}>
          <MarkdownWorkspace />
        </Suspense>
      </div>
    </WindowFrame>
  )
}
