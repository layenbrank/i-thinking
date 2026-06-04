import { Icon } from '@iconify/react'
import { Tooltip } from 'antd'
import { clsx } from 'clsx'
import dayjs from 'dayjs'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

import { useClockStore, type ClockStyle } from '@/stores/clock'
import styles from '@/views/clock/clock.module.scss'

// ─── Helpers ───────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, '0')
}

const STYLE_OPTIONS: { key: ClockStyle; label: string; icon: string }[] = [
  { key: 'digital', label: '数字', icon: 'mdi:clock-digital' },
  { key: 'analog', label: '指针', icon: 'mdi:clock-outline' },
  { key: 'flip', label: '翻页', icon: 'mdi:cards-playing-outline' },
  { key: 'neon', label: '霓虹', icon: 'mdi:led-strip-variant' },
  { key: 'minimal', label: '极简', icon: 'mdi:minus-circle-outline' }
]

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

// ─── Flip Digit ────────────────────────────────────────────

function FlipDigit({ value }: { value: string }) {
  return (
    <div className={styles.flipCard}>
      <AnimatePresence mode="wait">
        <motion.div
          key={value}
          className={styles.flipNumber}
          initial={{ rotateX: -90, opacity: 0 }}
          animate={{ rotateX: 0, opacity: 1 }}
          exit={{ rotateX: 90, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: 'center', perspective: 300 }}>
          {value}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Analog Clock ──────────────────────────────────────────

interface AnalogProps {
  hours: number
  minutes: number
  seconds: number
}

function AnalogClock({ hours, minutes, seconds }: AnalogProps) {
  const hourDeg = (hours % 12) * 30 + minutes * 0.5
  const minuteDeg = minutes * 6 + seconds * 0.1
  const secondDeg = seconds * 6

  return (
    <svg
      className={styles.analogSvg}
      viewBox="-100 -100 200 200">
      {/* Clock face */}
      <circle
        cx={0}
        cy={0}
        r={95}
        fill="none"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={1.5}
      />
      {/* Hour markers */}
      {Array.from({ length: 12 }).map(function (_, i) {
        const angle = ((i * 30 - 90) * Math.PI) / 180
        const x1 = Math.cos(angle) * 80
        const y1 = Math.sin(angle) * 80
        const x2 = Math.cos(angle) * 90
        const y2 = Math.sin(angle) * 90
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(0,0,0,0.45)"
            strokeWidth={i % 3 === 0 ? 2.5 : 1.5}
            strokeLinecap="round"
          />
        )
      })}
      {/* Minute markers */}
      {Array.from({ length: 60 }).map(function (_, i) {
        if (i % 5 === 0) return null
        const angle = ((i * 6 - 90) * Math.PI) / 180
        const x1 = Math.cos(angle) * 86
        const y1 = Math.sin(angle) * 86
        const x2 = Math.cos(angle) * 91
        const y2 = Math.sin(angle) * 91
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={0.8}
            strokeLinecap="round"
          />
        )
      })}
      {/* Hour hand */}
      <g transform={`rotate(${hourDeg} 0 0)`}>
        <line
          x1={0}
          y1={8}
          x2={0}
          y2={-54}
          stroke="#1a1a2e"
          strokeWidth={5}
          strokeLinecap="round"
        />
      </g>
      {/* Minute hand */}
      <g transform={`rotate(${minuteDeg} 0 0)`}>
        <line
          x1={0}
          y1={10}
          x2={0}
          y2={-72}
          stroke="#333"
          strokeWidth={3}
          strokeLinecap="round"
        />
      </g>
      {/* Second hand */}
      <g transform={`rotate(${secondDeg} 0 0)`}>
        <line
          x1={0}
          y1={16}
          x2={0}
          y2={-80}
          stroke="#4080ff"
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      </g>
      {/* Center dot */}
      <circle
        cx={0}
        cy={0}
        r={4.5}
        fill="#4080ff"
      />
      <circle
        cx={0}
        cy={0}
        r={2}
        fill="#fff"
      />
    </svg>
  )
}

// ─── Clock Styles ──────────────────────────────────────────

interface ClockDisplayProps {
  h: string
  m: string
  s: string
}

function DigitalDisplay({ h, m, s }: ClockDisplayProps) {
  const [colonVisible, setColonVisible] = useState(true)

  useEffect(function () {
    const t = setInterval(function () {
      setColonVisible(function (v) {
        return !v
      })
    }, 500)
    return function () {
      clearInterval(t)
    }
  }, [])

  return (
    <div className={styles.digital}>
      <div className={styles.digitGroup}>
        <span className={styles.digit}>{h[0]}</span>
        <span className={styles.digit}>{h[1]}</span>
      </div>
      <span
        className={styles.colon}
        style={{ opacity: colonVisible ? 1 : 0.15 }}>
        :
      </span>
      <div className={styles.digitGroup}>
        <span className={styles.digit}>{m[0]}</span>
        <span className={styles.digit}>{m[1]}</span>
      </div>
      <span
        className={styles.colon}
        style={{ opacity: colonVisible ? 1 : 0.15 }}>
        :
      </span>
      <div className={styles.digitGroup}>
        <span className={styles.digit}>{s[0]}</span>
        <span className={styles.digit}>{s[1]}</span>
      </div>
    </div>
  )
}

function FlipDisplay({ h, m, s }: ClockDisplayProps) {
  return (
    <div className={styles.flipContainer}>
      <FlipDigit value={h[0]} />
      <FlipDigit value={h[1]} />
      <span className={styles.flipColon}>:</span>
      <FlipDigit value={m[0]} />
      <FlipDigit value={m[1]} />
      <span className={styles.flipColon}>:</span>
      <FlipDigit value={s[0]} />
      <FlipDigit value={s[1]} />
    </div>
  )
}

function NeonDisplay({ h, m, s }: ClockDisplayProps) {
  return (
    <div className={styles.neonDisplay}>
      <span className={styles.neonText}>
        {h}:{m}:{s}
      </span>
    </div>
  )
}

function MinimalDisplay({ h, m, s }: ClockDisplayProps) {
  return (
    <div className={styles.minimalDisplay}>
      <div className={styles.minimalTime}>
        {h}:{m}
      </div>
      <div className={styles.minimalSec}>{s}</div>
    </div>
  )
}

// ─── Main View ─────────────────────────────────────────────

export default function ClockView() {
  const { clockStyle, setClockStyle } = useClockStore()

  const [now, setNow] = useState(dayjs())
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(function () {
    timerRef.current = setInterval(function () {
      setNow(dayjs())
    }, 1000)
    return function () {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const h = pad(now.hour())
  const m = pad(now.minute())
  const s = pad(now.second())
  const dateLabel = now.format('YYYY年MM月DD日') + ' ' + WEEK_LABELS[now.day()]
  const isNeon = clockStyle === 'neon'

  return (
    <div className={styles.container}>
      <div
        className={styles.card}
        data-style={clockStyle}
        data-region="true">
        {/* Date header */}
        <div
          className={clsx(styles.dateLabel, { [styles.dateLabelDark]: isNeon })}
          data-region="true">
          {dateLabel}
        </div>

        {/* Clock display — animated style switch */}
        <AnimatePresence
          mode="wait"
          initial={false}>
          <motion.div
            key={clockStyle}
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}>
            {clockStyle === 'digital' && (
              <DigitalDisplay
                h={h}
                m={m}
                s={s}
              />
            )}
            {clockStyle === 'analog' && (
              <AnalogClock
                hours={now.hour()}
                minutes={now.minute()}
                seconds={now.second()}
              />
            )}
            {clockStyle === 'flip' && (
              <FlipDisplay
                h={h}
                m={m}
                s={s}
              />
            )}
            {clockStyle === 'neon' && (
              <NeonDisplay
                h={h}
                m={m}
                s={s}
              />
            )}
            {clockStyle === 'minimal' && (
              <MinimalDisplay
                h={h}
                m={m}
                s={s}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Style switcher */}
      <div
        data-region="true"
        className={styles.switcher}>
        {STYLE_OPTIONS.map(function (opt) {
          return (
            <Tooltip
              key={opt.key}
              title={opt.label}
              placement="top">
              <motion.button
                className={clsx(styles.switchBtn, {
                  [styles.switchBtnActive]: clockStyle === opt.key
                })}
                whileTap={{ scale: 0.88 }}
                onClick={function () {
                  setClockStyle(opt.key)
                }}>
                <Icon
                  icon={opt.icon}
                  width={18}
                  height={18}
                />
              </motion.button>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
