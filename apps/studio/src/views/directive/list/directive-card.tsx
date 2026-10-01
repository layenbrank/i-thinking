import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Progress } from '@i-thinking/design/components/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import { motion, useReducedMotion } from 'motion/react'
import { memo } from 'react'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import {
  RUN_STATUS_STYLES,
  type DirectiveRuns,
  formatAbsoluteTime,
  formatDuration,
  formatRelativeTime
} from '../run/run-status'
import { findBucketMark } from './bucket'
import { CARD_ENTER, CARD_HOVER, CARD_TAP, cardDelay, cardTransition } from './motion'

/**
 * 指令卡片：一眼看清是哪条指令、几步、几个输入、现在跑得怎么样、上次什么时候跑的、能不能直接跑。
 *
 * 视觉参考快捷指令，但按 PC 工作台改过：
 * - 圆角色块图标（扫分类）+ 左缘状态条（扫成败）各管一件事
 * - 墙面用更大圆角与轻阴影浮在浅底上；窄栏保持紧凑
 *
 * 卡片自己是个 `div`（里面还有一键执行按钮），不能用 `button` 套 `button`：整卡的点击交给容器的
 * `onClick`，键盘焦点交给铺满卡片的那层无内容按钮，两者最终都走同一个 `onOpen`。
 *
 * 卡片有几十上百张，父组件的时钟每跳一次就会重渲染一轮，故按值 `memo`。
 */

/** 两种摆放方式下卡片自己的内边距与要不要露出描述 */
const VARIANTS = {
  rail: {
    card: 'gap-2 rounded-xl p-2.5 pl-3.5',
    icon: 'size-7 rounded-lg',
    iconGlyph: 'size-4',
    hasSummary: false
  },
  wall: {
    card: 'gap-2.5 rounded-2xl p-3.5 shadow-xs',
    icon: 'size-9 rounded-xl',
    iconGlyph: 'size-[18px]',
    hasSummary: true
  }
}

interface Props {
  entry: DirectiveEntry
  isActive: boolean
  runs: DirectiveRuns
  stepCount: number
  /** 父组件的时钟，按分钟级刷新相对时间 */
  now: number
  variant?: keyof typeof VARIANTS
  /** 分组内序号，用来封顶 stagger；不传就不做延迟 */
  motionIndex?: number
  onOpen: (name: string) => void
  onRun: (name: string) => void
}

function DirectiveCard(props: Props) {
  const { entry, runs } = props
  const variantKey = props.variant ?? 'rail'
  const variant = VARIANTS[variantKey]
  const isReducedMotion = useReducedMotion()
  // 解析失败的文件也会被列出来（`summary` 为空）：跑不起来，状态徽标也读不出来，就把这件事顶到最前面
  const isParsed = entry.summary !== null
  const status = isParsed && runs.status ? RUN_STATUS_STYLES[runs.status] : null
  const mark = findBucketMark(entry.bucket)
  const inputCount = entry.summary?.input_count ?? 0
  // 同一条指令能并发跑，徽标只写「运行中」看不出有几路
  const statusLabel =
    status && runs.running > 1 ? `${status.label} ×${runs.running}` : (status?.label ?? '')
  const ranAtTitle = runs.lastAt
    ? `最近执行：${formatAbsoluteTime(runs.lastAt)}${runs.lastDurationMs === null ? '' : `（耗时 ${formatDuration(runs.lastDurationMs)}）`}`
    : ''
  const description = variant.hasSummary ? (entry.summary?.description ?? '') : ''
  const delay = cardDelay(props.motionIndex ?? 0, !!isReducedMotion)
  const enter = isReducedMotion ? CARD_ENTER.reduced : CARD_ENTER
  const metaPad = variantKey === 'wall' ? 'pl-11' : 'pl-9'

  const runButton = isParsed ? (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn(
            'relative z-10 -mr-0.5 shrink-0 text-muted-foreground',
            'hover:bg-primary hover:text-primary-foreground',
            'transition-[background-color,color,opacity,transform] duration-200',
            variantKey === 'wall' &&
              'rounded-full opacity-80 group-hover/card:opacity-100 focus-visible:opacity-100'
          )}
          aria-label={`运行 ${entry.name}`}
          onClick={function (event) {
            event.stopPropagation()
            props.onRun(entry.name)
          }}>
          <Icon
            icon="mdi:play"
            className="size-3.5"
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">运行 {entry.name}</TooltipContent>
    </Tooltip>
  ) : null

  return (
    <motion.div
      initial={enter.initial}
      animate={enter.animate}
      exit={enter.exit}
      whileHover={isReducedMotion || variantKey === 'rail' ? undefined : CARD_HOVER}
      whileTap={isReducedMotion ? undefined : CARD_TAP}
      transition={cardTransition(delay, !!isReducedMotion)}
      className={cn(
        'group/card relative flex w-full cursor-pointer flex-col overflow-hidden border bg-card',
        'transition-[border-color,background-color,box-shadow] duration-200',
        variant.card,
        // 焦点圈画在容器上：卡片 overflow-hidden，画在里面那层按钮上会被裁掉
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
        props.isActive
          ? 'border-primary bg-accent text-accent-foreground shadow-sm ring-1 ring-primary/20'
          : 'border-border/70 hover:border-border hover:bg-accent-hover',
        variantKey === 'wall' && !props.isActive && 'hover:shadow-md'
      )}
      onClick={function () {
        props.onOpen(entry.name)
      }}>
      {status ? (
        <motion.span
          aria-hidden
          initial={isReducedMotion ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.26, ease: 'easeOut', delay: delay + 0.04 }}
          className={cn('absolute inset-y-0 left-0 w-[3px] origin-top', status.rail)}
        />
      ) : null}

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-start gap-2.5">
          <span
            title={mark.label}
            className={cn(
              'inline-flex shrink-0 items-center justify-center transition-colors',
              variant.icon,
              mark.tile
            )}>
            <Icon
              icon={mark.icon}
              className={variant.iconGlyph}
            />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span
                title={entry.name}
                className="min-w-0 flex-1 truncate text-sm font-semibold tracking-tight">
                {entry.name}
              </span>
              {runs.hasUnread ? (
                <span
                  role="img"
                  aria-label="有还没看过的执行结果"
                  title="有还没看过的执行结果"
                  className="size-1.5 shrink-0 rounded-full bg-primary ring-2 ring-primary/20"
                />
              ) : null}
              {!isParsed ? (
                <Badge
                  variant="outline"
                  className="shrink-0 gap-1 font-normal text-destructive">
                  <Icon icon="mdi:file-alert-outline" />
                  解析失败
                </Badge>
              ) : status ? (
                <Badge
                  variant="outline"
                  className={cn(
                    'shrink-0 gap-1 rounded-full font-normal',
                    status.tone
                  )}>
                  <Icon
                    icon={status.icon}
                    className={cn(runs.status === 'running' && 'animate-pulse')}
                  />
                  {statusLabel}
                </Badge>
              ) : null}
            </div>

            {description ? (
              <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {/* 空间不够时先牺牲左边的步骤数，时间与一键执行必须留在原地 */}
        <div
          className={cn(
            'flex h-6 items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground',
            metaPad
          )}>
          <span className="min-w-0 truncate">
            {/* 读不出来的文件没有步骤数可言：写「0 步」会被当成「这条指令是空的」 */}
            {isParsed ? `${props.stepCount} 步 · ${inputCount} 输入` : ''}
          </span>
          {runs.failed > 0 ? (
            <span className="shrink-0 text-destructive">· {runs.failed} 次失败</span>
          ) : null}
          <span className="ml-auto flex shrink-0 items-center gap-1">
            {runs.lastAt ? (
              <span
                className="flex items-center gap-1 tabular-nums"
                title={ranAtTitle}>
                <Icon
                  icon="mdi:history"
                  className="size-3"
                />
                {formatRelativeTime(runs.lastAt, props.now)}
              </span>
            ) : null}
            {runButton}
          </span>
        </div>

        {runs.status === 'running' && props.stepCount > 0 ? (
          <div className={cn('flex items-center gap-2', metaPad)}>
            <Progress
              value={Math.min(100, (runs.doneSteps / props.stepCount) * 100)}
              className="h-1 bg-primary/15"
              aria-label={`${entry.name} 运行进度`}
            />
            <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
              {runs.doneSteps}/{props.stepCount}
            </span>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        aria-current={props.isActive}
        aria-label={`打开 ${entry.name}`}
        className="absolute inset-0 z-0 rounded-[inherit] outline-none"
      />
    </motion.div>
  )
}

export default memo(DirectiveCard, function (prev, next) {
  if (prev.entry !== next.entry) return false
  if (prev.isActive !== next.isActive) return false
  if (prev.stepCount !== next.stepCount) return false
  if (prev.runs !== next.runs) return false
  if (prev.variant !== next.variant) return false
  if (prev.motionIndex !== next.motionIndex) return false
  if (prev.onOpen !== next.onOpen) return false
  if (prev.onRun !== next.onRun) return false
  // 卡片上随时间变的只有「最近执行」那句相对时间；压根没跑过的卡片不跟着时钟重渲染
  return prev.runs.lastAt === null || prev.now === next.now
})
