import { Splitter } from 'antd'
import { clsx } from 'clsx'

import { useMorphStore } from '@/stores/morph.ts'
import ConvertModal from '@/views/morph/overlay/components/ConvertModal.tsx'
import MergeModal from '@/views/morph/overlay/components/MergeModal.tsx'
import SplitModal from '@/views/morph/overlay/components/SplitModal.tsx'
import { Overlay } from '@/views/morph/overlay/index.ts'

import styles from '@/views/morph/morph.module.scss'
import './morph.scss'

export default function Morph() {
  const summaryVisible = useMorphStore((s) => s.summaryVisible)

  return (
    <div className={clsx([styles.morph, styles.root])}>
      <Overlay.Utility />

      <div className={styles.workspace}>
        <Splitter className={styles.splitter}>
          <Splitter.Panel
            min="180px"
            max="320px"
            defaultSize="220px"
            resizable
            className={styles.navigation}>
            <Overlay.Navigation />
          </Splitter.Panel>
          <Splitter.Panel className={styles.section}>
            <Overlay.Section />
          </Splitter.Panel>
        </Splitter>

        {summaryVisible && (
          <div className={styles.summary}>
            <Overlay.Summary />
          </div>
        )}
      </div>

      <Overlay.StatusBar />

      <MergeModal />
      <SplitModal />
      <ConvertModal />
    </div>
  )
}
