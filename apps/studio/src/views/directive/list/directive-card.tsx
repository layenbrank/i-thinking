import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Progress } from '@i-thinking/design/components/progress'
import { Tooltip, TooltipContent, TooltipTrigger } from '@i-thinking/design/components/tooltip'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import { memo, type MouseEvent } from 'react'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import {
  RUN_STATUS_STYLES,
  type DirectiveRuns,
  formatAbsoluteTime,
  formatDuration,
  formatRelativeTime
} from '../run/run-status'
import { CARD_SIZE } from '../render/card-size'
import { findBucketMark } from './bucket'

/**
 * 指令卡片：一眼看清是哪条指令、几步、几个输入、现在跑得怎么样、上次什么时候跑的、能不能直接跑。
 *
 * 墙面左右分区（对齐生产力工具「内容 / 动作」分层）：
 * - 左：图标 + 名称 / 描述 / 元信息 —— 点整卡打开编排
 * - 右：状态 + 运行 —— 独立触达区，按钮 ≥ 32px，避免右下角小三角误触
 *
 * 窄栏仍紧凑，但运行钮升到 `icon-sm`。
 *
 * 卡片自己是个 `div`（里面还有一键执行按钮），不能用 `button` 套 `button`：整卡的点击交给容器的
 * `onClick`，键盘焦点交给铺满卡片的那层无内容按钮，两者最终都走同一个 `onOpen`。
 *
 * 卡片有几十上百张，父组件的时钟每跳一次就会重渲染一轮，故按值 `memo`。
 * 按下反馈用 CSS `active:scale`，不用 motion —— 分组保活后成批挂着，motion 实例更贵。
 */

/** 两种摆放方式下卡片自己的内边距与要不要露出描述 */
const VARIANTS = {
  rail: {
    card: `rounded-xl p-2.5 ${CARD_SIZE.rail.className}`,
    icon: 'size-7 rounded-lg',
    iconGlyph: 'size-4',
    hasSummary: false
  },
  wall: {
    card: `rounded-2xl p-3.5 shadow-xs ${CARD_SIZE.wall.className}`,
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
  onOpen: (name: string) => void
  onRun: (name: string) => void
  onDelete: (name: string) => void
}

function DirectiveCard(props: Props) {
  const { entry, runs } = props
  const variantKey = props.variant ?? 'rail'
  const variant = VARIANTS[variantKey]
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

  const statusBadge = !isParsed ? (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-normal text-destructive',
        variantKey === 'wall' ? 'w-full justify-center' : 'shrink-0'
      )}>
      <Icon icon="mdi:file-alert-outline" />
      解析失败
    </Badge>
  ) : status ? (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full font-normal',
        status.tone,
        variantKey === 'wall' ? 'w-full justify-center' : 'shrink-0'
      )}>
      <span
        aria-hidden
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          status.dot,
          runs.status === 'running' && 'animate-pulse'
        )}
      />
      {statusLabel}
    </Badge>
  ) : null

  function handleRun(event: MouseEvent) {
    event.stopPropagation()
    props.onRun(entry.name)
  }

  function handleDelete(event: MouseEvent) {
    event.stopPropagation()
    props.onDelete(entry.name)
  }

  const deleteButton =
    variantKey === 'wall' ? (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        title={`删除 ${entry.name}`}
        className={cn(
          'relative z-10 h-8 w-8 shrink-0 cursor-pointer',
          'border-border/80 text-muted-foreground',
          'hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive',
          'opacity-70 group-hover/card:opacity-100 focus-visible:opacity-100'
        )}
        aria-label={`删除 ${entry.name}`}
        onClick={handleDelete}>
        <Icon
          icon="mdi:trash-can-outline"
          className="size-4"
        />
      </Button>
    ) : (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'relative z-10 shrink-0 cursor-pointer text-muted-foreground',
              'opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100',
              'hover:bg-destructive/10 hover:text-destructive'
            )}
            aria-label={`删除 ${entry.name}`}
            onClick={handleDelete}>
            <Icon
              icon="mdi:trash-can-outline"
              className="size-4"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">删除 {entry.name}</TooltipContent>
      </Tooltip>
    )

  const runButton =
    isParsed && variantKey === 'wall' ? (
      <Button
        type="button"
        variant="outline"
        size="sm"
        title={`运行 ${entry.name}`}
        className={cn(
          'relative z-10 h-8 min-w-0 flex-1 cursor-pointer gap-1.5 px-2.5',
          'border-border/80 text-foreground',
          'hover:border-primary hover:bg-primary hover:text-primary-foreground',
          'focus-visible:border-primary'
        )}
        aria-label={`运行 ${entry.name}`}
        onClick={handleRun}>
        <Icon
          icon="mdi:play"
          className="size-4"
        />
        运行
      </Button>
    ) : isParsed ? (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className={cn(
              'relative z-10 shrink-0 cursor-pointer text-muted-foreground',
              'hover:bg-primary hover:text-primary-foreground'
            )}
            aria-label={`运行 ${entry.name}`}
            onClick={handleRun}>
            <Icon
              icon="mdi:play"
              className="size-4"
            />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">运行 {entry.name}</TooltipContent>
      </Tooltip>
    ) : null

  const wallActions = (
    <div className="mt-auto flex items-center gap-1.5">
      {deleteButton}
      {runButton ?? <div className="h-8 min-w-0 flex-1" />}
    </div>
  )

  const metaTitle = [
    isParsed ? `${props.stepCount} 步 · ${inputCount} 输入` : '',
    runs.failed > 0 ? `${runs.failed} 次失败` : '',
    ranAtTitle
  ]
    .filter(Boolean)
    .join(' · ')

  const meta = (
    <div
      className="w-full min-w-0 truncate text-xs leading-snug text-muted-foreground"
      title={metaTitle || undefined}>
      {isParsed ? (
        <span>
          {props.stepCount} 步 · {inputCount} 输入
        </span>
      ) : null}
      {runs.failed > 0 ? (
        <span className="text-destructive"> · {runs.failed} 次失败</span>
      ) : null}
      {runs.lastAt ? (
        <span className="tabular-nums">
          {' · '}
          {formatRelativeTime(runs.lastAt, props.now)}
        </span>
      ) : null}
    </div>
  )

  return (
    <div
      className={cn(
        'group/card relative flex w-full min-w-0 cursor-pointer flex-col overflow-hidden border bg-card',
        'transition-[border-color,background-color,box-shadow,transform] duration-200',
        'active:scale-[0.985] motion-reduce:active:scale-100',
        variant.card,
        // 焦点圈画在容器上：卡片 overflow-hidden，画在里面那层按钮上会被裁掉
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
        props.isActive
          ? 'border-primary bg-accent text-accent-foreground'
          : 'border-border/70 hover:border-border hover:bg-accent-hover',
        // 阴影只做层次，不跟选中描边叠色；墙面默认轻阴影，悬停略抬起
        variantKey === 'wall'
          ? props.isActive
            ? 'shadow-xs'
            : 'shadow-xs hover:shadow-md'
          : props.isActive
            ? 'shadow-xs'
            : 'shadow-none'
      )}
      onClick={function () {
        props.onOpen(entry.name)
      }}>
      {variantKey === 'wall' ? (
        <div className="relative z-10 flex min-h-0 flex-1 items-stretch gap-3">
          {/* 左：识别 + 说明 */}
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <div className="flex items-start gap-2.5">
              <span
                title={mark.label}
                className={cn(
                  'inline-flex shrink-0 items-center justify-center',
                  variant.icon,
                  mark.tile
                )}>
                <Icon
                  icon={mark.icon}
                  className={variant.iconGlyph}
                />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    title={entry.name}
                    className="min-w-0 truncate text-sm font-semibold tracking-tight">
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
                </div>
                {description ? (
                  <p
                    title={description}
                    className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto flex flex-col gap-1.5 pl-11">
              {meta}
              {runs.status === 'running' && props.stepCount > 0 ? (
                <div className="flex items-center gap-2">
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
          </div>

          {/* 右：状态 + 删除/运行，形成一块动作轨 */}
          <div
            className={cn(
              'relative z-10 flex min-w-[6.5rem] shrink-0 flex-col items-stretch justify-between gap-2',
              'border-l border-border/50 pl-3'
            )}
            onClick={function (event) {
              // 右侧空白也不要触发打开，避免点状态附近误开编辑
              event.stopPropagation()
            }}>
            <div className="min-h-5">{statusBadge}</div>
            {wallActions}
          </div>
        </div>
      ) : (
        <div className="relative z-10 flex min-h-0 w-full min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
          <div className="flex min-w-0 items-start gap-2.5">
            <span
              title={mark.label}
              className={cn(
                'inline-flex shrink-0 items-center justify-center',
                variant.icon,
                mark.tile
              )}>
              <Icon
                icon={mark.icon}
                className={variant.iconGlyph}
              />
            </span>
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
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
              <span className="shrink-0">{statusBadge}</span>
            </div>
          </div>

          {(entry.summary?.description ?? '') ? (
            <p
              title={entry.summary?.description ?? ''}
              className="w-full min-w-0 truncate pl-9 text-xs leading-snug text-muted-foreground">
              {entry.summary?.description}
            </p>
          ) : null}

          <div className="mt-auto flex h-8 min-w-0 items-center gap-1 pl-9 text-xs text-muted-foreground">
            <div className="min-w-0 flex-1 overflow-hidden">{meta}</div>
            {deleteButton}
            {runButton}
          </div>

          {runs.status === 'running' && props.stepCount > 0 ? (
            <div className="flex min-w-0 items-center gap-2 pl-9">
              <Progress
                value={Math.min(100, (runs.doneSteps / props.stepCount) * 100)}
                className="h-1 min-w-0 flex-1 bg-primary/15"
                aria-label={`${entry.name} 运行进度`}
              />
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {runs.doneSteps}/{props.stepCount}
              </span>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="button"
        aria-current={props.isActive}
        aria-label={`打开 ${entry.name}`}
        className="absolute inset-0 z-0 cursor-pointer rounded-[inherit] outline-none"
      />
    </div>
  )
}

export default memo(DirectiveCard, function (prev, next) {
  if (prev.entry !== next.entry) return false
  if (prev.isActive !== next.isActive) return false
  if (prev.stepCount !== next.stepCount) return false
  if (prev.runs !== next.runs) return false
  if (prev.variant !== next.variant) return false
  if (prev.onOpen !== next.onOpen) return false
  if (prev.onRun !== next.onRun) return false
  if (prev.onDelete !== next.onDelete) return false
  // 卡片上随时间变的只有「最近执行」那句相对时间；压根没跑过的卡片不跟着时钟重渲染
  return prev.runs.lastAt === null || prev.now === next.now
})
