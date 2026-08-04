import { Splitter } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import ConvertModal from '@/features/magnetic-tiles/morph/workspace/overlay/components/ConvertModal.tsx'
import MergeModal from '@/features/magnetic-tiles/morph/workspace/overlay/components/MergeModal.tsx'
import SplitModal from '@/features/magnetic-tiles/morph/workspace/overlay/components/SplitModal.tsx'
import { Overlay } from '@/features/magnetic-tiles/morph/workspace/overlay/index.ts'
import { useMorphStore } from '@/stores/morph.ts'

import styles from '@/features/magnetic-tiles/morph/workspace/morph.module.scss'

export default function Morph() {
  const summaryVisible = useMorphStore(function (s) {
    return s.summaryVisible
  })
  const [sizes, onUpdateSizes] = useState<(number | string)[]>(['20%', '80%'])

  return (
    <div className={clsx(styles.root)}>
      <div className={styles.panes}>
        <Splitter
          onResize={onUpdateSizes}
          className={styles.splitter}>
          <Splitter.Panel
            size={sizes[0]}
            min="20%"
            max="50%"
            resizable>
            <Overlay.Navigation />
          </Splitter.Panel>
          <Splitter.Panel size={sizes[1]}>
            <Overlay.Section />
          </Splitter.Panel>
        </Splitter>

        {summaryVisible ? <Overlay.Summary /> : null}
      </div>

      <Overlay.StatusBar />

      <MergeModal />
      <SplitModal />
      <ConvertModal />
    </div>
  )
}
