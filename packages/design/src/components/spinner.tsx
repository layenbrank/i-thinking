import { Icon, type IconProps } from '@iconify/react/offline'
import { cn } from 'cn'

function Spinner({ className, ...props }: Omit<IconProps, 'icon'>) {
  return (
    <Icon
      icon="lucide:loader-circle"
      role="status"
      aria-label="Loading"
      className={cn('size-4 animate-spin', className)}
      {...props}
    />
  )
}

export { Spinner }
