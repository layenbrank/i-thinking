import { cn } from 'cn'

import { CARD_SIZE, type CardSizeVariant } from './card-size'

/**
 * 卡片占位骨：与真卡同圆角、同内边距、同最小高度，开合壳动画时不跳尺寸。
 * 墙面骨架对齐左右分区（左内容 / 右动作）。
 */

interface Props {
  variant?: CardSizeVariant
  className?: string
}

const VARIANT_CHROME = {
  wall: 'rounded-2xl p-3.5',
  rail: 'rounded-xl p-2.5',
  library: 'rounded-xl p-3 gap-2.5'
} as const

function CardSkeleton(props: Props) {
  const variant = props.variant ?? 'wall'
  const size = CARD_SIZE[variant]

  if (variant === 'wall') {
    return (
      <div
        aria-hidden
        className={cn(
          'flex items-stretch gap-3 border border-border/50 bg-card/70 shadow-xs',
          VARIANT_CHROME.wall,
          size.className,
          props.className
        )}>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-start gap-2.5">
            <div className="size-9 shrink-0 animate-pulse rounded-xl bg-muted" />
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted/60" />
            </div>
          </div>
          <div className="mt-auto h-3 w-28 animate-pulse rounded bg-muted/50 pl-11" />
        </div>
        <div className="flex min-w-[6.5rem] shrink-0 flex-col items-stretch justify-between gap-2 border-l border-border/40 pl-3">
          <div className="h-5 w-full animate-pulse rounded-full bg-muted/70" />
          <div className="flex items-center gap-1.5">
            <div className="size-8 shrink-0 animate-pulse rounded-md bg-muted/50" />
            <div className="h-8 min-w-0 flex-1 animate-pulse rounded-md bg-muted/60" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className={cn(
        'flex flex-col border border-border/50 bg-card/70 shadow-xs',
        VARIANT_CHROME[variant],
        size.className,
        props.className
      )}>
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            'shrink-0 animate-pulse bg-muted',
            variant === 'rail' ? 'size-7 rounded-lg' : 'size-9 rounded-xl'
          )}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5">
          <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          {variant === 'library' ? (
            <div className="h-3 w-1/3 animate-pulse rounded bg-muted/80" />
          ) : null}
        </div>
      </div>
      {variant === 'library' ? (
        <div className="mt-2 flex flex-col gap-1.5">
          <div className="h-3 w-full animate-pulse rounded bg-muted/70" />
          <div className="h-3 w-4/5 animate-pulse rounded bg-muted/60" />
        </div>
      ) : null}
      <div className="mt-auto flex h-8 items-center justify-between gap-2">
        <div className="h-3 w-20 animate-pulse rounded bg-muted/50" />
        <div className="size-8 animate-pulse rounded-md bg-muted/50" />
      </div>
    </div>
  )
}

export { CardSkeleton }
