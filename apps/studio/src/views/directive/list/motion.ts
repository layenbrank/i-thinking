/**
 * 指令列表动效参数：跟 run-chips / 路由切页同一套「短、跟手」节奏，
 * 几十张卡片时 stagger 也要封顶，别让末排等半秒才露出来。
 *
 * 时长压在 150–300ms（ui-ux-pro-max）：进场 ease-out，退场更快；
 * hover 只动 transform，不碰 width/height。
 */

import type { Transition, Variants } from 'motion/react'

const EASE = 'easeOut' as const

/** 单张卡片进场；delay 由调用方按序号封顶后传入 */
const CARD_ENTER = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
  reduced: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
} as const

/** 位移 ≤2px：反馈感，不是飘起来 */
const CARD_HOVER = { y: -1.5 }
const CARD_TAP = { scale: 0.985 }

/** 分组内容展开 / 收起 —— 高度动画留给分组，卡片自己只做淡入 */
const GROUP_BODY: Variants = {
  open: { opacity: 1, height: 'auto' },
  closed: { opacity: 0, height: 0 }
}

const STAGGER_STEP = 0.028
const STAGGER_CAP = 12

function cardDelay(index: number, isReducedMotion: boolean): number {
  if (isReducedMotion) return 0
  return Math.min(index, STAGGER_CAP) * STAGGER_STEP
}

function cardTransition(delay: number, isReducedMotion: boolean): Transition {
  return {
    duration: isReducedMotion ? 0.1 : 0.22,
    ease: EASE,
    delay
  }
}

function groupTransition(isReducedMotion: boolean): Transition {
  return {
    duration: isReducedMotion ? 0.01 : 0.2,
    ease: EASE
  }
}

export {
  CARD_ENTER,
  CARD_HOVER,
  CARD_TAP,
  GROUP_BODY,
  cardDelay,
  cardTransition,
  groupTransition
}
