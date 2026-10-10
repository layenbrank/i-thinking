import { type ComponentPropsWithRef, forwardRef } from 'react'

import { cn } from 'cn'
import { Button } from '../components/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/tooltip'

export type TooltipIconButtonProps = ComponentPropsWithRef<typeof Button> & {
  tooltip: string
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export const TooltipIconButton = forwardRef<HTMLButtonElement, TooltipIconButtonProps>(
  ({ children, tooltip, side = 'bottom', className, ...rest }, ref) => {
    return (
      <TooltipProvider delay={0}>
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                {...rest}
                className={cn('aui-button-icon size-6 p-1', className)}
                ref={ref}>
                {children}
                <span className="aui-sr-only sr-only">{tooltip}</span>
              </Button>
            }
          />
          <TooltipContent side={side}>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }
)

TooltipIconButton.displayName = 'TooltipIconButton'
