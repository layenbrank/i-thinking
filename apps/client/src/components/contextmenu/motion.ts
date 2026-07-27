import type { MenuMotionSlot } from '@/components/contextmenu/types'

const PANEL_TRANSITION = {
  duration: 0.16,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
}

const SUBMENU_TRANSITION = {
  duration: 0.14,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number]
}

const PANEL_MOTION: MenuMotionSlot = {
  initial: { opacity: 0, scale: 0.98, y: -4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.98, y: -2 },
  transition: PANEL_TRANSITION
}

const SUBMENU_MOTION: MenuMotionSlot = {
  initial: { opacity: 0, scale: 0.98, x: -4 },
  animate: { opacity: 1, scale: 1, x: 0 },
  exit: { opacity: 0, scale: 0.98, x: -2 },
  transition: SUBMENU_TRANSITION
}

const REDUCED_MOTION: MenuMotionSlot = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.08 }
}

function mergeMotionSlot(
  base: MenuMotionSlot,
  override?: MenuMotionSlot,
  isReduced?: boolean
): MenuMotionSlot {
  if (isReduced) {
    return {
      initial: override?.initial ?? REDUCED_MOTION.initial,
      animate: override?.animate ?? REDUCED_MOTION.animate,
      exit: override?.exit ?? REDUCED_MOTION.exit,
      transition: override?.transition ?? REDUCED_MOTION.transition
    }
  }
  return {
    initial: override?.initial ?? base.initial,
    animate: override?.animate ?? base.animate,
    exit: override?.exit ?? base.exit,
    transition: override?.transition ?? base.transition
  }
}

export { PANEL_MOTION, SUBMENU_MOTION, REDUCED_MOTION, mergeMotionSlot }
