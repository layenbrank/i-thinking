import { Badge } from '@i-thinking/design/components/badge'
import { Button } from '@i-thinking/design/components/button'
import { Progress } from '@i-thinking/design/components/progress'
import { Icon } from '@iconify/react/offline'
import { cn } from 'cn'
import { motion } from 'motion/react'
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

/**
 * 指令卡片：一眼看清是哪条指令、几步、几个输入、现在跑得怎么样、上次什么时候跑的、能不能直接跑。
 *
 * 运行状态是卡片里最要紧的信息 —— 同一条指令可以并发多次，所以徽标看的是**聚合**结果
 * （见 `indexRunSummaries`），不是某一次任务。状态同时体现在左边缘色条（`rail`）上：
 * 列表里几十张卡片时，颜色比读徽标文字快得多。
 *
 * 卡片自己是个 `div`（里面还有一键执行按钮），不能用 `button` 套 `button`：整卡的点击交给容器的
 * `onClick`，键盘焦点交给铺满卡片的那层无内容按钮，两者最终都走同一个 `onOpen`。
 *
 * 卡片有几十上百张，父组件的时钟每跳一次就会重渲染一轮，故按值 `memo`：没跑过的卡片不显示
 * 时间，时钟与它无关，直接跳过。
 *
 * 同一张卡片两边都在用：左栏（`rail`）窄，只留名字与状态；卡片墙（`wall`）宽，多一句描述。
 */

/** 两种摆放方式下卡片自己的内边距与要不要露出描述 */
const VARIANTS = {
  rail: { card: 'gap-2 p-2.5 pl-3.5', hasSummary: false },
  wall: { card: 'gap-2.5 p-3 pl-4', hasSummary: true }
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
}

function DirectiveCard(props: Props) {
  const { entry, runs } = props
  const variant = VARIANTS[props.variant ?? 'rail']
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={cn(
        'relative flex w-full flex-col overflow-hidden rounded-lg border bg-card transition-colors',
        variant.card,
        // 焦点圈画在容器上：卡片 overflow-hidden，画在里面那层按钮上会被裁掉
        'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring/50',
        props.isActive
          ? 'border-primary bg-accent text-accent-foreground ring-1 ring-primary/20'
          : 'border-border hover:bg-accent-hover'
      )}
      onClick={function () {
        props.onOpen(entry.name)
      }}>
      {status ? (
        <span
          aria-hidden
          className={cn('absolute inset-y-0 left-0 w-[3px]', status.rail)}
        />
      ) : null}

      <div className="relative z-10 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span
            title={mark.label}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon
              icon={mark.icon}
              className="size-4"
            />
          </span>
          <span
            title={entry.name}
            className="min-w-0 flex-1 truncate text-sm font-medium">
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
              className={cn('shrink-0 gap-1 font-normal', status.tone)}>
              <Icon
                icon={status.icon}
                className={cn(runs.status === 'running' && 'animate-pulse')}
              />
              {statusLabel}
            </Badge>
          ) : null}
        </div>

        {description ? (
          <p className="line-clamp-2 pl-9 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}

        {/* 空间不够时先牺牲左边的步骤数，时间与一键执行必须留在原地 */}
        <div className="flex h-6 items-center gap-1.5 pl-9 text-xs whitespace-nowrap text-muted-foreground">
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
            {isParsed ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                // 图标居中在 24px 的方框里，往右挪 4px 才和上面的徽标对齐
                className="-mr-1 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                aria-label={`运行 ${entry.name}`}
                title={`运行 ${entry.name}`}
                onClick={function (event) {
                  event.stopPropagation()
                  props.onRun(entry.name)
                }}>
                <Icon
                  icon="mdi:play"
                  className="size-3.5"
                />
              </Button>
            ) : null}
          </span>
        </div>

        {runs.status === 'running' && props.stepCount > 0 ? (
          <div className="flex items-center gap-2 pl-9">
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
        className="absolute inset-0 z-0 rounded-lg outline-none"
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
  if (prev.onOpen !== next.onOpen) return false
  if (prev.onRun !== next.onRun) return false
  // 卡片上随时间变的只有「最近执行」那句相对时间；压根没跑过的卡片不跟着时钟重渲染
  return prev.runs.lastAt === null || prev.now === next.now
})
