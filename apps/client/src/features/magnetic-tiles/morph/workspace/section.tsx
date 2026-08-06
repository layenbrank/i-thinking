import { clsx } from 'clsx'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'

import Canvas from '@/features/magnetic-tiles/morph/workspace/canvas/canvas.tsx'
import { TaskWorkbench } from '@/features/magnetic-tiles/morph/workspace/tasks/task-workbench'
import Toolbar from '@/features/magnetic-tiles/morph/workspace/toolbar/toolbar.tsx'
import styles from '@/features/magnetic-tiles/morph/workspace/section.module.scss'
import { useMorphStore } from '@/stores/morph.ts'
import { CSSVAR } from '@/themes'

const EASE = [0.22, 1, 0.36, 1] as const
const OFFSET = 8

function Section() {
  const isReducedMotion = useReducedMotion()
  const activeOperation = useMorphStore(function (s) {
    return s.activeOperation
  })

  const pane = activeOperation ?? 'canvas'
  const offset = isReducedMotion ? 0 : OFFSET
  const transition = {
    duration: isReducedMotion ? 0 : 0.2,
    ease: EASE
  }

  return (
    <div className={clsx(styles.section, styles.root, CSSVAR.KEY)}>
      <Toolbar />
      <div className={styles.stage}>
        <AnimatePresence
          mode="wait"
          initial={false}>
          <motion.div
            key={pane}
            className={styles.pane}
            initial={{ opacity: isReducedMotion ? 1 : 0, y: offset }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: isReducedMotion ? 1 : 0, y: -offset * 0.5 }}
            transition={transition}>
            {pane === 'canvas' ? <Canvas /> : <TaskWorkbench />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export { Section }
export default Section
