import clsx from 'clsx'
import { memo, useState } from 'react'

import styles from '@/features/magnetic-tiles/clock/flip-digit.module.scss'

interface FlipDigitProps {
  current: number
  /** 该位最大数字（时十位 2、分/秒十位 5），默认 9 */
  total?: number
  className?: string
}

function FlipDigitBase(props: FlipDigitProps) {
  const total = props.total ?? 9
  const [previous, onUpdatePrevious] = useState(-1)
  const [shown, onUpdateShown] = useState(props.current)
  const [isFlipping, onUpdateFlipping] = useState(false)
  const [flipGen, onUpdateFlipGen] = useState(0)

  // 渲染期同步 previous/shown，避免 useEffect 晚一帧：新数字先亮、旧牌未就位 → 闪烁
  if (props.current !== shown) {
    onUpdatePrevious(shown)
    onUpdateShown(props.current)
    if (!isFlipping) onUpdateFlipping(true)
    onUpdateFlipGen(function (gen) {
      return gen + 1
    })
  }

  const digits = []
  for (let digit = 0; digit <= total; digit += 1) {
    const isActive = shown === digit
    const isPrevious = previous === digit
    digits.push(
      <li
        key={digit}
        className={clsx(
          styles.digitItem,
          isActive && styles.digitActive,
          isPrevious && styles.digitPrevious
        )}>
        <div
          key={isActive || isPrevious ? `top-${flipGen}` : 'top'}
          className={styles.digitTop}>
          <div
            className={styles.digitShadow}
            aria-hidden
          />
          <div className={styles.digitText}>{digit}</div>
        </div>
        <div
          key={isActive || isPrevious ? `bottom-${flipGen}` : 'bottom'}
          className={styles.digitBottom}>
          <div
            className={styles.digitShadow}
            aria-hidden
          />
          <div className={styles.digitText}>{digit}</div>
        </div>
      </li>
    )
  }

  return (
    <div
      className={clsx(
        styles.root,
        isFlipping && styles.flipAnimation,
        props.className
      )}
      aria-label={String(shown)}>
      <ul className={styles.digitList}>{digits}</ul>
    </div>
  )
}

const FlipDigit = memo(FlipDigitBase)

interface FlipClockProps {
  hours: string
  minutes: string
  seconds?: string
  showSeconds?: boolean
  useDots?: boolean
  className?: string
}

function FlipSeparator(props: { useDots: boolean }) {
  if (props.useDots) return <span className={styles.separator} />
  return <span className={styles.colon}>:</span>
}

function FlipClockBase(props: FlipClockProps) {
  const showSeconds = props.showSeconds ?? Boolean(props.seconds)
  const useDots = props.useDots ?? true

  return (
    <div className={clsx(styles.flipRow, props.className)}>
      <FlipDigit
        current={Number(props.hours[0])}
        total={2}
      />
      <FlipDigit current={Number(props.hours[1])} />
      <FlipSeparator useDots={useDots} />
      <FlipDigit
        current={Number(props.minutes[0])}
        total={5}
      />
      <FlipDigit current={Number(props.minutes[1])} />
      {showSeconds && props.seconds ? (
        <>
          <FlipSeparator useDots={useDots} />
          <FlipDigit
            current={Number(props.seconds[0])}
            total={5}
          />
          <FlipDigit current={Number(props.seconds[1])} />
        </>
      ) : null}
    </div>
  )
}

const FlipClock = memo(FlipClockBase)

export { FlipClock, FlipDigit }
