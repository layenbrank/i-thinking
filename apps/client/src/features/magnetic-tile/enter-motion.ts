import type { Transition, Variants } from 'motion/react'

/** 对齐原 scroll-fx 入场参数 */
const DURATION = 0.75
const OFFSET_Y = -36
const SCALE = 0.5
const STAGGER = 0.04
const EASE = [0.34, 1.56, 0.64, 1] as const

const ENTER = {
  variants: {
    hidden: {
      opacity: 0,
      y: OFFSET_Y,
      scale: SCALE
    },
    show: {
      opacity: 1,
      y: 0,
      scale: 1
    }
  } satisfies Variants,
  transition(index: number, isReducedMotion: boolean): Transition {
    if (isReducedMotion) {
      return { duration: 0 }
    }
    return {
      duration: DURATION,
      ease: EASE,
      delay: index * STAGGER
    }
  }
}

export { ENTER }
