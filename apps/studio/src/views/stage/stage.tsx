import { clsx } from 'clsx'

import Controller from '@/features/controller/controller.tsx'

import styles from '@/views/stage/stage.module.scss'

interface StageProps {
  /** 主窗口的磁贴要上下留白；浮层贴边，故默认不留 */
  isPadded?: boolean
}

/** 磁贴舞台：主窗口与浮层共用的中段 + 底栏 */
export default function Stage(props: StageProps) {
  return (
    <>
      <main className={clsx(styles.stage, props.isPadded && styles.padded)}>
        <Controller.Mirror>
          <Controller.MagneticTile />
        </Controller.Mirror>
      </main>
      <footer className={clsx(styles.foot)}></footer>
    </>
  )
}
