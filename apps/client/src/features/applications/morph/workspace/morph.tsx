import { Splitter } from 'antd'
import { clsx } from 'clsx'

import { useMorphStore } from '@/stores/morph.ts'
import ConvertModal from '@/features/applications/morph/workspace/overlay/components/ConvertModal.tsx'
import MergeModal from '@/features/applications/morph/workspace/overlay/components/MergeModal.tsx'
import SplitModal from '@/features/applications/morph/workspace/overlay/components/SplitModal.tsx'
import { Overlay } from '@/features/applications/morph/workspace/overlay/index.ts'

import styles from '@/features/applications/morph/workspace/morph.module.scss'

export default function Morph() {
  const summaryVisible = useMorphStore((s) => s.summaryVisible)
  const [sizes, onUpdateSizes] = useState<(number | string)[]>(['20%', '80%'])

  return (
    <div className={clsx([styles.morph, styles.root])}>
      <Overlay.Utility />

      <div className={styles.workspace}>
        <Splitter
          onResize={onUpdateSizes}
          className={styles.splitter}>
          <Splitter.Panel
            size={sizes[0]}
            min="20%"
            max="50%"
            resizable
            className={styles.navigation}>
            <Overlay.Navigation />
          </Splitter.Panel>
          <Splitter.Panel
            size={sizes[1]}
            className={styles.section}>
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
