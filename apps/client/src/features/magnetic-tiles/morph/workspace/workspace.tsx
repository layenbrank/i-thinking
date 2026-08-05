import { Splitter } from 'antd'
import { clsx } from 'clsx'
import { useState } from 'react'

import Navigation from '@/features/magnetic-tiles/morph/workspace/navigation.tsx'
import Section from '@/features/magnetic-tiles/morph/workspace/section.tsx'
import StatusBar from '@/features/magnetic-tiles/morph/workspace/statusbar.tsx'
import Summary from '@/features/magnetic-tiles/morph/workspace/summary.tsx'
import { useMorphStore } from '@/stores/morph.ts'
import { CSSVAR } from '@/themes'

import styles from '@/features/magnetic-tiles/morph/workspace/workspace.module.scss'

export default function Workspace() {
  const summaryVisible = useMorphStore(function (s) {
    return s.summaryVisible
  })
  const [sizes, onUpdateSizes] = useState<(number | string)[]>(['20%', '80%'])

  return (
    <div className={clsx(styles.root, CSSVAR.KEY)}>
      <div className={styles.panes}>
        <Splitter
          onResize={onUpdateSizes}
          className={styles.splitter}>
          <Splitter.Panel
            size={sizes[0]}
            min="20%"
            max="50%"
            resizable>
            <Navigation />
          </Splitter.Panel>
          <Splitter.Panel size={sizes[1]}>
            <Section />
          </Splitter.Panel>
        </Splitter>

        {summaryVisible ? <Summary /> : null}
      </div>

      <StatusBar />
    </div>
  )
}
