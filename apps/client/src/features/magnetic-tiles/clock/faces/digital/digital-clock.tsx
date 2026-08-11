import clsx from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import {
  COLON,
  DIGIT,
} from '@/features/magnetic-tiles/clock/clock-motion.ts'
import styles from './digital.module.scss'

interface DigitalClockProps {
  h: string
  m: string
  s: string
  showSeconds: boolean
  tick: number
  className?: string
  isNeon?: boolean
}

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
          >
          {props.value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

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

export function DigitalClock(props: DigitalClockProps) {
  const isReduced = !!useReducedMotion()

  return (
    <div className={clsx(styles.digital, props.isNeon && styles.neon, props.className)}>
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

export { styles as digitalStyles }
