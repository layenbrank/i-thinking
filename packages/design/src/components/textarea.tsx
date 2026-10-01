import { cn } from 'cn'
import * as React from 'react'

import { FOCUS_INVALID, FOCUS_RING } from '../lib/focus'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30',
        FOCUS_RING,
        FOCUS_INVALID,
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
