import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

import { cn } from 'cn'

/**
 * Toaster —— 通知层（替代 antd 的 `message` / `notification`）。
 *
 * - 颜色走本仓 token（`--popover` / `--border` / `--radius`），随 `.dark` 自动切换
 * - 不引入 next-themes，也不注入主题状态：颜色已由 token 决定，`theme` 交给消费方按需传
 */
function Toaster({ className, ...props }: ToasterProps) {
  return (
    <Sonner
      className={cn('toaster group', className)}
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)'
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
