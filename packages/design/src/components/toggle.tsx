import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Toggle as TogglePrimitive } from 'radix-ui'

/**
 * Toggle / ToggleGroup 共用变体。
 * 选中态用主色浅底 + 主色字（必要时主色描边），与未选中的 muted 灰边拉开对比。
 */
const toggleVariants = cva(
  cn(
    'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap outline-none',
    'transition-[color,background-color,border-color,box-shadow]',
    'hover:bg-accent hover:text-accent-foreground',
    'focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/40',
    'disabled:pointer-events-none disabled:opacity-50',
    'aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
    'data-[state=on]:bg-primary/10 data-[state=on]:font-medium data-[state=on]:text-primary',
    'data-[state=on]:hover:bg-primary/15 data-[state=on]:hover:text-primary',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
  ),
  {
    variants: {
      variant: {
        default: 'bg-transparent text-foreground',
        outline: cn(
          'border border-input bg-background text-foreground shadow-xs',
          'hover:bg-accent hover:text-accent-foreground',
          'data-[state=on]:border-primary/50 data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:shadow-none',
          'data-[state=on]:hover:border-primary/60 data-[state=on]:hover:bg-primary/15'
        )
      },
      size: {
        default: 'h-9 min-w-9 px-2',
        sm: 'h-8 min-w-8 px-1.5',
        lg: 'h-10 min-w-10 px-2.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
