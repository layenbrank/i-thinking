import { Button, theme } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { useContext, useEffect, useMemo, useState } from 'react'

import {
  MagneticTile,
  OverlayContext,
  type OverlayControlProps
} from '@/features/magnetic-tile/magnetic-tile.tsx'
import { paintPrimary } from '@/features/magnetic-tile/paint'
import styles from '@/features/magnetic-tiles/clock/overlay.module.scss'
import { useClockStore, type ClockStyle } from '@/stores/clock'

const STYLES: { value: ClockStyle; label: string; hint: string }[] = [
  { value: 'digital', label: '数字', hint: '清晰数字时钟' },
  { value: 'analog', label: '指针', hint: '经典表盘' },
  { value: 'flip', label: '翻页', hint: '分段卡片' },
  { value: 'neon', label: '强调', hint: '主色点缀' },
  { value: 'minimal', label: '极简', hint: '轻量字距' }
]

function Overlay(props: OverlayControlProps) {
  const { onUpdateVisible } = useContext(OverlayContext)
  const { token } = theme.useToken()
  const { clockStyle, updateClockStyle } = useClockStore()
  const [now, onUpdateNow] = useState(function () {
    return dayjs()
  })

  const palette = useMemo(
    function () {
      return paintPrimary(token.colorPrimary)
    },
    [token.colorPrimary]
  )

  useEffect(function () {
    const timer = setInterval(function () {
      onUpdateNow(dayjs())
    }, 1000)
    return function () {
      clearInterval(timer)
    }
  }, [])

  const previewTime = clockStyle === 'minimal' ? now.format('HH:mm') : now.format('HH:mm:ss')

  return (
    <MagneticTile.Overlay
      cache={props.cache}
      onAbort={props.onAbort}
      abortTimeoutMs={props.abortTimeoutMs}
      caption={true}
      className={styles.root}
      onCancel={function () {
        onUpdateVisible(false)
      }}
      controls={
        <Button
          type="primary"
          onClick={function () {
            onUpdateVisible(false)
          }}>
          完成
        </Button>
      }>
      <div className={styles.stage}>
        <div className={clsx(styles.panel, styles.preview, styles[clockStyle])}>
          <div className={styles.previewTime}>{previewTime}</div>
          <div className={styles.previewDate}>{now.format('YYYY年M月D日 dddd')}</div>
        </div>

        <div
          className={clsx(styles.panel, styles.styleList)}
          role="radiogroup"
          aria-label="时钟样式">
          {STYLES.map(function (item) {
            const isActive = clockStyle === item.value
            return (
              <button
                key={item.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                className={clsx(styles.styleRow, isActive && styles.styleRowActive)}
                onClick={function () {
                  updateClockStyle(item.value)
                }}>
                <div className={styles.styleMeta}>
                  <span className={styles.styleLabel}>{item.label}</span>
                  <span className={styles.styleHint}>{item.hint}</span>
                </div>
                <span className={clsx(styles.mini, styles[item.value])}>
                  {item.value === 'analog' ? (
                    <span className={styles.miniFace} />
                  ) : (
                    <span className={styles.miniTime}>12:00</span>
                  )}
                </span>
                <span
                  className={styles.accent}
                  style={{ background: isActive ? palette[5] : palette[2] }}
                />
              </button>
            )
          })}
        </div>
      </div>
    </MagneticTile.Overlay>
  )
}

export default Overlay
