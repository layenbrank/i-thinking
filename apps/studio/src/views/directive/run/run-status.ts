/**
 * 运行状态的展示与聚合。
 *
 * 「这条指令在跑吗、跑成没成」不能只看某一个任务：同一条指令可以并发多次，所以列表卡片的
 * 徽标必须把属于它的任务合起来看 —— 有任务在跑就是「运行中」，否则看最近起的那次。
 *
 * 状态是**两层**的：本会话的 `runs` 是实时的，corex 账本里的 `last_run` 是跨会话留下来的。
 * 同一条指令两者都有时以实时为准（它更新），只有账本时就用账本 —— 重启后卡片上的「上次跑成没成、
 * 什么时候跑的」才不会凭空消失。
 *
 * 聚合**一次做全**（`indexRunSummaries`）：卡片按指令名取自己那份，分组排序也取同一份，
 * 免得每张卡片、每次时钟跳动都自己把 runs 过滤一遍。
 */

import type { DirectiveEntry, DirectiveRun } from '@/shared/ipc/specs/sidecar'
import type { CorexRun, RunStatus } from '@/stores/corex'

import type { RunLog } from './types'

interface MarkStyle {
  icon: string
  /** 字形颜色 */
  tone: string
  /** 左缘色条：卡片用它标状态（几十张卡片时颜色比徽标更快认出来），日志块用它把多行输出圈成一段 */
  rail: string
}

interface StatusStyle extends MarkStyle {
  label: string
}

/** 表驱动：状态 / 日志级别各自对应一套图标与颜色，省掉散落各处的 if */
const RUN_STATUS_STYLES: Record<RunStatus, StatusStyle> = {
  running: {
    label: '运行中',
    icon: 'mdi:progress-clock',
    tone: 'text-primary',
    rail: 'bg-primary/60 animate-pulse'
  },
  ok: {
    label: '成功',
    icon: 'mdi:check-circle-outline',
    tone: 'text-chart-2',
    rail: 'bg-chart-2/70'
  },
  failed: {
    label: '失败',
    icon: 'mdi:alert-circle-outline',
    tone: 'text-destructive',
    rail: 'bg-destructive/70'
  }
}

const LOG_LEVEL_STYLES: Record<RunLog['level'], MarkStyle> = {
  info: { icon: 'mdi:information-outline', tone: 'text-foreground', rail: 'border-border' },
  success: { icon: 'mdi:check-circle-outline', tone: 'text-chart-2', rail: 'border-chart-2/60' },
  error: {
    icon: 'mdi:alert-circle-outline',
    tone: 'text-destructive',
    rail: 'border-destructive/60'
  }
}

const MINUTE_MS = 60_000
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS
const WEEK_MS = 7 * DAY_MS

/** 一条指令的运行概览（卡片徽标、进度条、「最近执行」分组都靠它） */
interface DirectiveRuns {
  /** 有任务在跑 → `running`；否则最近一次的结果；从没跑过 → `null` */
  status: RunStatus | null
  total: number
  running: number
  failed: number
  /** 最近起的那次任务（只算本会话）；从没跑过 → `null` */
  latest: CorexRun | null
  /** 最近那次任务已结束的步骤数（进度条的分子） */
  doneSteps: number
  /** 最近一次运行的开始时刻（本会话的实时任务优先，退到 corex 账本）；从没跑过 → `null` */
  lastAt: Date | null
  /** 最近一次运行的耗时；还在跑、或账本里没记时长 → `null` */
  lastDurationMs: number | null
  /** corex 账本里的那次（跨会话）；没跑过或历史被关掉 → `null` */
  baseline: DirectiveRun | null
  /** 有「结束时间晚于上次看过」的任务 —— 卡片上的未读圆点看它 */
  hasUnread: boolean
}

const EMPTY_RUNS: DirectiveRuns = {
  status: null,
  total: 0,
  running: 0,
  failed: 0,
  latest: null,
  doneSteps: 0,
  lastAt: null,
  lastDurationMs: null,
  baseline: null,
  hasUnread: false
}

/**
 * 一条指令的全部任务 → 概览；`items` 按启动顺序追加，故末项即最新。
 *
 * 未读判定看所有任务的**结束**时刻，不看 `latest`：并发跑时最新那次可能在跑（没结束），
 * 而更早那次刚结束的结果还没被看过，圆点不该漏掉。`seenAt` 是「上次看的时刻」，
 * 没有记录就是 0 —— 于是任何结束过的任务都算未读。账本里的那次同样算：跑完就关掉窗口，
 * 下次打开时那条结果本来就没看过。
 */
function summarize(
  items: readonly CorexRun[],
  seenAt: number,
  baseline: DirectiveRun | null
): DirectiveRuns {
  const latest = items[items.length - 1]
  let running = 0
  let failed = 0
  let lastEndedAt = baseline ? baseline.ended_at_ms : 0

  items.forEach(function (run) {
    if (run.status === 'running') running += 1
    else if (run.status === 'failed') failed += 1
    if (run.endedAt) lastEndedAt = Math.max(lastEndedAt, run.endedAt.getTime())
  })

  // 本会话跑过就以本会话为准（它一定不比账本旧），否则由账本顶上
  const startedAt = latest ? latest.startedAt.getTime() : (baseline?.started_at_ms ?? 0)
  const status: RunStatus | null = running
    ? 'running'
    : (latest?.status ?? (baseline ? (baseline.ok ? 'ok' : 'failed') : null))

  return {
    status,
    total: items.length,
    running,
    failed,
    latest: latest ?? null,
    doneSteps: latest?.doneSteps ?? 0,
    lastAt: startedAt > 0 ? new Date(startedAt) : null,
    lastDurationMs: latest
      ? (latest.endedAt ? latest.endedAt.getTime() - latest.startedAt.getTime() : null)
      : (baseline?.duration_ms ?? null),
    baseline,
    hasUnread: lastEndedAt > seenAt
  }
}

/**
 * 指令名 → 运行概览。
 *
 * 三种取用方（卡片、分组、运行台）都从这里拿，故**两条来源都要覆盖**：本会话跑过的、账本里记着的。
 * 从没跑过的指令查不到，取用方拿 `EMPTY_RUNS` 兜底。
 */
function indexRunSummaries(
  runs: readonly CorexRun[],
  seen: Record<string, number>,
  lastRuns: Record<string, DirectiveRun> = {}
): Record<string, DirectiveRuns> {
  const byName: Record<string, CorexRun[]> = {}

  runs.forEach(function (run) {
    const items = byName[run.name]
    if (items) items.push(run)
    else byName[run.name] = [run]
  })

  const summaries: Record<string, DirectiveRuns> = {}
  Object.keys(byName).forEach(function (name) {
    summaries[name] = summarize(byName[name], seen[name] ?? 0, lastRuns[name] ?? null)
  })
  Object.keys(lastRuns).forEach(function (name) {
    if (summaries[name]) return
    summaries[name] = summarize([], seen[name] ?? 0, lastRuns[name])
  })
  return summaries
}

/** 指令名 → 账本里最近的一次运行；`list_directives` 的 `last_run` 摊平一层 */
function indexLastRuns(directives: readonly DirectiveEntry[]): Record<string, DirectiveRun> {
  const lastRuns: Record<string, DirectiveRun> = {}
  directives.forEach(function (entry) {
    if (entry.last_run) lastRuns[entry.name] = entry.last_run
  })
  return lastRuns
}

/** 指令名 → 声明的步骤数；由 corex `list_directives` 的 summary 提供，解析不了的算 0 */
function indexStepCounts(directives: readonly DirectiveEntry[]): Record<string, number> {
  const counts: Record<string, number> = {}
  directives.forEach(function (entry) {
    counts[entry.name] = entry.summary?.step_count ?? 0
  })
  return counts
}

/** 任务是否还在跑 —— 过滤、上色、进度条判定都走它 */
function isRunning(run: CorexRun): boolean {
  return run.status === 'running'
}

/** 耗时：还在跑的任务算到此刻，`now` 由调用方按秒推着走 */
function formatElapsed(run: CorexRun, now: number = Date.now()): string {
  const end = run.endedAt ? run.endedAt.getTime() : now
  return formatDuration(Math.max(0, end - run.startedAt.getTime()))
}

/** 毫秒 → 「1.2s」这种人读的耗时（任务的与账本里的都走它，口径一致） */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  if (ms < MINUTE_MS) return `${(ms / 1000).toFixed(1)}s`

  const seconds = Math.floor(ms / 1000)
  return `${Math.floor(seconds / 60)}m${String(seconds % 60).padStart(2, '0')}s`
}

/**
 * 「最近执行」要的是模糊的近远，不是精确时刻 —— 精确值放 `title` 里（见 `formatAbsoluteTime`）。
 * 时钟回拨导致差值为负时按「刚刚」处理，别显示成负几天前。
 */
function formatRelativeTime(at: Date, now: number = Date.now()): string {
  const ms = now - at.getTime()

  if (ms < MINUTE_MS) return '刚刚'
  if (ms < HOUR_MS) return `${Math.floor(ms / MINUTE_MS)} 分钟前`
  if (ms < DAY_MS) return `${Math.floor(ms / HOUR_MS)} 小时前`
  if (ms < WEEK_MS) return `${Math.floor(ms / DAY_MS)} 天前`
  return `${at.getMonth() + 1}月${at.getDate()}日`
}

/** 精确时刻（本地时区），给相对时间当 `title` */
function formatAbsoluteTime(at: Date): string {
  const pad = function (value: number) {
    return String(value).padStart(2, '0')
  }
  const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`
  return `${date} ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}

export {
  DAY_MS,
  EMPTY_RUNS,
  HOUR_MS,
  LOG_LEVEL_STYLES,
  MINUTE_MS,
  RUN_STATUS_STYLES,
  WEEK_MS,
  formatAbsoluteTime,
  formatDuration,
  formatElapsed,
  formatRelativeTime,
  indexLastRuns,
  indexRunSummaries,
  indexStepCounts,
  isRunning
}
export type { DirectiveRuns, StatusStyle }
