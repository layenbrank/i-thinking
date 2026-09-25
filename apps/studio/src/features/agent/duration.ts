/**
 * 时长格式化 + 「这一轮跑了多久」的计时。
 *
 * 为什么要独立成模块：折叠条（`process-group.tsx`）与右栏「运行」段都要显示时长，
 * 两处各写一遍必然有一天对不上（一个显示 12s、另一个显示 12.3s）。
 *
 * 计时口径：assistant-ui 的 `metadata.timing` 在本仓没有接线（`@assistant-ui/react`
 * 里没有产出它的代码），助手消息的 `createdAt` 又是**运行开始**时刻 —— 两者都算不出
 * 一轮跑了多久。所以右栏只报**本窗口亲眼看到的**那一轮：`isRunning` 的上下沿之间自己数。
 * 历史加载回来的会话没有这份数据，就不显示，绝不编一个数字。
 * 计时还要按线程分账（`useRunClock` 的 `threadID`）：右栏在切换会话时不重挂载。
 */

import { useEffect, useState } from 'react'

import type { DurationFormat } from '@/stores/agent.ts'

/** 计时的心跳：1 秒够用（显示精度最细也就 0.1s），再密只是白烧渲染 */
const TICK_MS = 1_000

/**
 * 「已用时」由心跳逐秒写入 state（不在 effect 体里同步 setState）：所以它是秒级的，
 * 且本轮开始后的第一条心跳之前为空 —— 少显示半秒，好过渲染期读 ref 算时长。
 */

/** `precise` 给到 0.1s，`integer` 取整到秒（折叠条的 `duration` 属性要的是秒数） */
function formatDurationSeconds(ms: number, format: DurationFormat): number {
  return format === 'precise' ? Math.round(ms / 100) / 10 : Math.round(ms / 1000)
}

/**
 * 秒数给人看：过了一分钟换算成「Xm Ys」。
 *
 * 先按精度取整再拆分钟秒：直接对毫秒拆会留下浮点尾巴（`59.949999999999996s`），
 * 而每段各自取整又会出现「1m 60s」。
 */
function formatDurationText(ms: number, format: DurationFormat): string {
  const seconds = formatDurationSeconds(ms, format)
  const minutes = Math.floor(seconds / 60)
  if (minutes === 0) return `${seconds}s`

  return `${minutes}m ${Math.round((seconds - minutes * 60) * 10) / 10}s`
}

interface RunClock {
  /** 正在跑时的已用毫秒；不在跑、或本窗口没看到开始时刻时为 null */
  elapsedMs: number | null
  /** 上一次在本窗口看到的运行时长；没看到过为 null（历史会话不给假数字） */
  lastRunMs: number | null
}

/**
 * 读数带上线程键：右栏不随切换会话重挂载，不带键会把 A 会话跑出来的时长显示到 B 会话头上。
 * 对不上就当作「本窗口没见过」，而不是拿别人的数糊上去。
 */
interface ThreadScoped<T> {
  threadID: string | null
  value: T
}

function readThreadScoped<T>(scoped: ThreadScoped<T> | null, threadID: string | null): T | null {
  return scoped !== null && scoped.threadID === threadID ? scoped.value : null
}

function useRunClock(isRunning: boolean, threadID: string | null): RunClock {
  const [elapsed, setElapsed] = useState<ThreadScoped<number> | null>(null)
  const [lastRun, setLastRun] = useState<ThreadScoped<number> | null>(null)

  useEffect(
    function () {
      if (!isRunning) return

      const started = Date.now()

      const timer = setInterval(function () {
        setElapsed({ threadID, value: Date.now() - started })
      }, TICK_MS)

      // 收尾在 cleanup 里：此刻才知道这一轮真正跑了多久，也覆盖「跑一半组件被卸载」
      return function () {
        clearInterval(timer)
        setElapsed(null)
        setLastRun({ threadID, value: Date.now() - started })
      }
    },
    [isRunning, threadID]
  )

  return {
    elapsedMs: readThreadScoped(elapsed, threadID),
    lastRunMs: readThreadScoped(lastRun, threadID)
  }
}

export { formatDurationSeconds, formatDurationText, readThreadScoped, useRunClock }
export type { RunClock }
