import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import { motion, useReducedMotion } from 'motion/react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import * as React from 'react'

import { FOCUS_INVALID, FOCUS_RING } from '../lib/focus'
import { CHECK_TRANSITION } from '../lib/motion'

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  const isReducedMotion = useReducedMotion()

  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-[color,box-shadow,background-color,border-color] outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:data-[state=checked]:bg-primary',
        FOCUS_RING,
        FOCUS_INVALID,
        className
      )}
      {...props}>
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current"
        asChild>
        <motion.span
          initial={isReducedMotion ? false : { scale: 0.55, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={CHECK_TRANSITION}
          className="grid place-content-center">
          <Icon icon="lucide:check" className="size-3.5" />
        </motion.span>
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
