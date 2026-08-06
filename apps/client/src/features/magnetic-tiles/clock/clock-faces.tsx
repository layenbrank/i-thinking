import clsx from 'clsx'
import type dayjs from 'dayjs'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useRef } from 'react'

import {
  COLON,
  DIGIT,
  HAND,
  findClockwiseDeg
} from '@/features/magnetic-tiles/clock/clock-motion.ts'
import styles from '@/features/magnetic-tiles/clock/marker.module.scss'

function AnimatedDigit(props: {
  value: string
  className?: string
  isReduced: boolean
}) {
  const transition = DIGIT.transition(props.isReduced)

  return (
    <span className={clsx(styles.digitSlot, props.className)}>
      <AnimatePresence
        mode="sync"
        initial={false}>
        <motion.span
          key={props.value}
          className={styles.digit}
          variants={DIGIT.variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          style={{ transformStyle: 'preserve-3d' }}>
          {props.value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/** 固定节点：仅透明度脉冲，不改 scale，避免分隔符随秒跳动变大变小 */
function PulsingColon(props: { tick: number; className?: string; isReduced: boolean }) {
  const opacity = props.isReduced ? 1 : props.tick % 2 === 0 ? 1 : 0.35

  return (
    <motion.span
      className={clsx(styles.colon, props.className)}
      animate={{ opacity }}
      transition={COLON.transition(props.isReduced)}>
      :
    </motion.span>
  )
}

type TickGeom = {
  x1: number
  y1: number
  x2: number
  y2: number
  kind: 'min' | 'hour' | 'cardinal'
}

function findTickGeom(index: number): TickGeom {
  const rad = (index * 6 - 90) * (Math.PI / 180)
  const isHour = index % 5 === 0
  const isCardinal = index % 15 === 0
  const kind = isCardinal ? 'cardinal' : isHour ? 'hour' : 'min'
  const inner = isCardinal ? 39.2 : isHour ? 41 : 43.2
  const outer = 47.2
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return {
    x1: 50 + inner * cos,
    y1: 50 + inner * sin,
    x2: 50 + outer * cos,
    y2: 50 + outer * sin,
    kind
  }
}

const ANALOG_TICK_GEOMS = Array.from({ length: 60 }, function (_, i) {
  return findTickGeom(i)
})

const HAND_ORIGIN = {
  transformOrigin: '50px 50px',
  transformBox: 'view-box' as const
}

function AnalogFace(props: { now: dayjs.Dayjs; className?: string }) {
  const isReduced = !!useReducedMotion()
  const h = props.now.hour() % 12
  const m = props.now.minute()
  const s = props.now.second()
  const hourTarget = h * 30 + m * 0.5
  const minuteTarget = m * 6
  const secondTarget = s * 6

  const hourRot = useRef(hourTarget)
  const minuteRot = useRef(minuteTarget)
  const secondRot = useRef(secondTarget)

  hourRot.current = findClockwiseDeg(hourRot.current, hourTarget)
  minuteRot.current = findClockwiseDeg(minuteRot.current, minuteTarget)
  secondRot.current = findClockwiseDeg(secondRot.current, secondTarget)

  return (
    <div
      className={clsx(styles.analogFace, props.className)}
      role="img"
      aria-label={props.now.format('HH:mm:ss')}>
      <svg
        className={styles.analogDial}
        viewBox="0 0 100 100"
        aria-hidden>
        <circle
          className={styles.dialPlate}
          cx="50"
          cy="50"
          r="49.2"
        />
        <circle
          className={styles.dialRim}
          cx="50"
          cy="50"
          r="48.55"
          fill="none"
        />

        {ANALOG_TICK_GEOMS.map(function (tick, i) {
          return (
            <line
              key={i}
              className={clsx(
                styles.tickLine,
                tick.kind === 'hour' && styles.tickHourLine,
                tick.kind === 'cardinal' && styles.tickCardinalLine
              )}
              x1={tick.x1}
              y1={tick.y1}
              x2={tick.x2}
              y2={tick.y2}
            />
          )
        })}

        <motion.g
          animate={{ rotate: hourRot.current }}
          transition={HAND.hour(isReduced)}
          style={HAND_ORIGIN}>
          <line
            className={styles.handHourLine}
            x1="50"
            y1="54"
            x2="50"
            y2="27"
          />
        </motion.g>

        <motion.g
          animate={{ rotate: minuteRot.current }}
          transition={HAND.minute(isReduced)}
          style={HAND_ORIGIN}>
          <line
            className={styles.handMinuteLine}
            x1="50"
            y1="55"
            x2="50"
            y2="18"
          />
        </motion.g>

        <motion.g
          animate={{ rotate: secondRot.current }}
          transition={HAND.second(isReduced)}
          style={HAND_ORIGIN}>
          <line
            className={styles.handSecondLine}
            x1="50"
            y1="60"
            x2="50"
            y2="15"
          />
        </motion.g>

        <circle
          className={styles.hubOuter}
          cx="50"
          cy="50"
          r="2.4"
        />
        <circle
          className={styles.hubInner}
          cx="50"
          cy="50"
          r="1.05"
        />
      </svg>
    </div>
  )
}

function DigitalDigits(props: {
  h: string
  m: string
  s: string
  showSeconds: boolean
  tick: number
  className?: string
}) {
  const isReduced = !!useReducedMotion()

  return (
    <div className={clsx(styles.digital, props.className)}>
      <span className={styles.digitGroup}>
        <AnimatedDigit
          value={props.h[0]}
          isReduced={isReduced}
        />
        <AnimatedDigit
          value={props.h[1]}
          isReduced={isReduced}
        />
      </span>
      <PulsingColon
        tick={props.tick}
        isReduced={isReduced}
      />
      <span className={styles.digitGroup}>
        <AnimatedDigit
          value={props.m[0]}
          isReduced={isReduced}
        />
        <AnimatedDigit
          value={props.m[1]}
          isReduced={isReduced}
        />
      </span>
      {props.showSeconds ? (
        <>
          <PulsingColon
            tick={props.tick}
            isReduced={isReduced}
          />
          <span className={styles.digitGroup}>
            <AnimatedDigit
              value={props.s[0]}
              isReduced={isReduced}
            />
            <AnimatedDigit
              value={props.s[1]}
              isReduced={isReduced}
            />
          </span>
        </>
      ) : null}
    </div>
  )
}

function MinimalTime(props: {
  h: string
  m: string
  s: string
  showSeconds: boolean
  className?: string
}) {
  const isReduced = !!useReducedMotion()
  const transition = DIGIT.transition(isReduced)
  const timeKey = `${props.h}${props.m}`

  return (
    <div className={clsx(styles.minimal, props.className)}>
      <span className={styles.minimalTimeSlot}>
        <AnimatePresence
          mode="sync"
          initial={false}>
          <motion.span
            key={timeKey}
            className={styles.minimalTime}
            variants={DIGIT.variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
            style={{ transformStyle: 'preserve-3d' }}>
            {props.h}:{props.m}
          </motion.span>
        </AnimatePresence>
      </span>
      {props.showSeconds ? (
        <span className={styles.minimalSecSlot}>
          <AnimatePresence
            mode="sync"
            initial={false}>
            <motion.span
              key={props.s}
              className={styles.minimalSec}
              variants={DIGIT.variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              style={{ transformStyle: 'preserve-3d' }}>
              {props.s}
            </motion.span>
          </AnimatePresence>
        </span>
      ) : null}
    </div>
  )
}

export { AnalogFace, DigitalDigits, MinimalTime }
