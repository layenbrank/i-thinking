import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

import { MOTION } from '@/features/signin/constants.ts'
import styles from '@/features/signin/signin.module.scss'

type FormStaggerProps = {
  children: ReactNode
  className?: string
}

function FormStagger(props: FormStaggerProps) {
  const { children, className } = props
  const isReducedMotion = useReducedMotion()
  const containerVariants = MOTION.containerVariants(!!isReducedMotion)
  const transition = MOTION.transition(!!isReducedMotion)

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={transition}>
      {children}
    </motion.div>
  )
}

type MotionFieldProps = {
  children: ReactNode
  className?: string
}

function MotionField(props: MotionFieldProps) {
  const { children, className } = props
  const isReducedMotion = useReducedMotion()
  const itemVariants = MOTION.itemVariants({ isReducedMotion: !!isReducedMotion })
  const transition = MOTION.transition(!!isReducedMotion)

  return (
    <motion.div
      className={className ?? styles.fieldMotion}
      variants={itemVariants}
      transition={transition}>
      {children}
    </motion.div>
  )
}

export { FormStagger, MotionField }
