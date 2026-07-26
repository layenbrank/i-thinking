import { Radio } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import styles from '@/features/magnetic-tiles/clock/overlay.module.scss'
import { useClockStore, type ClockStyle } from '@/stores/clock'

const STYLES: { value: ClockStyle; label: string }[] = [
  { value: 'digital', label: '数字' },
  { value: 'analog', label: '指针' },
  { value: 'flip', label: '翻页' },
  { value: 'neon', label: '霓虹' },
  { value: 'minimal', label: '极简' }
]

export default function Overlay(props: OverlayControlProps) {
  const { visible, onUpdateVisible } = useContext(OverlayContext)
  const { clockStyle, updateClockStyle } = useClockStore()
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      className={clsx([styles.overlay, styles.root])}
      onCancel={function () {
        onUpdateVisible(false)
      }}>
      <div className={styles.body}>
        <header className={styles.header}>
          <h2 className={styles.title}>时钟样式</h2>
        </header>

        <div className={styles.preview}>
          <div className={styles.previewTime}>{now.format('HH:mm:ss')}</div>
          <div className={styles.previewDate}>{now.format('YYYY年M月D日 dddd')}</div>
          <div className={styles.previewStyle}>当前：{clockStyle}</div>
        </div>

        <Radio.Group
          value={clockStyle}
          optionType="button"
          buttonStyle="solid"
          options={STYLES}
          onChange={function (e) {
            updateClockStyle(e.target.value as ClockStyle)
          }}
        />
      </div>
    </MagneticTile.Overlay>
  )
}
