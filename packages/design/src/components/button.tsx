import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'
import * as React from 'react'

/**
 * Button —— shadcn `new-york` 变体，并对齐 antd 的语义面。
 *
 * antd 的 `danger` / `ghost` / `shape` / `block` 是正交开关，这里按 shadcn 惯例收敛：
 *
 * | antd | 这里 |
 * | --- | --- |
 * | `type="primary"` | `variant="default"` |
 * | `type="default"` | `variant="outline"` |
 * | `type="dashed"` | `variant="dashed"` |
 * | `type="text"` | `variant="ghost"`（注意与 antd 的 `ghost` 不是一回事）|
 * | `type="link"` | `variant="link"` |
 * | `variant="filled"` | `variant="secondary"` |
 * | `danger`（solid/outlined/dashed/filled/text/link 六档）| `destructive` / `destructive-outline` / `destructive-dashed` / `destructive-filled` / `destructive-ghost` / `destructive-link` |
 * | `size="large" | "middle" | "small"` | `size="lg" | "default" | "sm"` |
 * | `shape="circle"` | `size="icon"` / `icon-sm` / `icon-lg` |
 * | `shape="round"` | `className="rounded-full"` |
 * | `block` | `className="w-full"`（不设时按钮宽度由父容器决定）|
 * | 按下反馈（antd wave）| 各变体按 antd 色阶下沉（hover 变浅 / active 变深）+ `active:scale-*` |
 * | `loading` | 自行组合 `components/spinner`（不做内置 prop）|
 * | `color` 预设色（blue/cyan/…）| 无对应 token，不提供 |
 */

const buttonVariants = cva(
  // `active:scale-[0.98]`：按下反馈，与包内其它可交互组件同一套手感；reduced-motion 下关掉。
  // hover / active 一律引用 globals.css 的交互态 token（--primary-hover / --primary-active 等），
  // 不在组件里用 alpha 或 color-mix 现算：状态色要能被主题统一调整，且 alpha 在白底上常看不出差别。
  // 宽度交给父容器：column flex / grid 会把按钮拉满（CSS 的 align-items: stretch，antd 同理），
  // 需要满宽时像 antd 的 `block` 一样显式 `className="w-full"`。
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 motion-reduce:transition-none motion-reduce:active:scale-100",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive-hover active:bg-destructive-active focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border bg-background shadow-xs hover:bg-accent-hover hover:text-accent-foreground active:border-primary active:text-primary dark:border-input dark:bg-input/30 dark:hover:bg-accent-hover',
        // antd 的 dashed：弱强调动作（新增、导入…）
        dashed:
          'border border-dashed bg-background shadow-xs hover:bg-accent-hover hover:text-accent-foreground active:border-primary active:text-primary dark:border-input dark:bg-input/30 dark:hover:bg-accent-hover',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary-hover active:bg-secondary-active',
        ghost:
          'hover:bg-accent-hover hover:text-accent-foreground active:bg-accent-active active:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:text-primary-hover hover:underline active:text-primary-active',
        // danger 补齐 antd 的六档（solid / outlined / dashed / filled / text / link）
        'destructive-outline':
          'border border-destructive/60 bg-background text-destructive shadow-xs hover:bg-destructive/15 active:border-destructive active:bg-destructive/25 dark:border-destructive/50 dark:bg-input/30 dark:hover:bg-destructive/20',
        'destructive-dashed':
          'border border-dashed border-destructive/60 bg-background text-destructive shadow-xs hover:bg-destructive/15 active:border-destructive active:bg-destructive/25 dark:border-destructive/50 dark:bg-input/30 dark:hover:bg-destructive/20',
        'destructive-filled':
          'bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30 dark:bg-destructive/20 dark:hover:bg-destructive/25 dark:active:bg-destructive/35',
        'destructive-ghost':
          'text-destructive hover:bg-destructive/20 active:bg-destructive/30 dark:hover:bg-destructive/20',
        'destructive-link':
          'text-destructive underline-offset-4 hover:underline active:text-destructive-active'
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
