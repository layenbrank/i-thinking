import { useEffect, useState } from 'react'

import type { CorexRun } from '@/stores/corex'
import { dropRunFrames, registerRun } from '@/stores/run-logs'
import { toIpcMessage } from '@/utils/ipc.errors.ts'

/**
 * 单动作试跑：走 corex 的 `invoke`（不是整条指令的 `run`）。进度帧和指令运行走同一条通路、
 * 同样按 `runId` 归位，所以结果能原样交给运行台的输出面板渲染，不必另造一套日志界面。
 *
 * 试跑不记账（不碰 `useCorexStore` 的 `runs`）：它不属于哪条指令，列表卡片的徽标也就没它的
 * 位置。帧得自己收尾 —— 换一次试跑、关掉面板都把上一次的丢掉，不然每试一次就攒一坨帧。
 */

interface Trial {
  /** 这一次试跑；还没试过是 `null` */
  run: CorexRun | null
  isRunning: boolean
  start: (actionId: string, params: Record<string, unknown>) => void
}

let trialSeq = 0

/** 试跑编号：与指令运行同处一个命名空间（帧按它归位），前缀不同就撞不上 */
function nextTrialId(): string {
  trialSeq += 1
  return `trial-${Date.now().toString(36)}-${trialSeq}`
}

function useTrial(): Trial {
  const [run, setRun] = useState<CorexRun | null>(null)

  const runId = run?.id

  useEffect(
    function () {
      return function () {
        if (runId) dropRunFrames([runId])
      }
    },
    [runId]
  )

  function settle(id: string, patch: Partial<CorexRun>): void {
    setRun(function (prev) {
      // 结果晚到就丢掉：面板上已经是新的一次试跑了
      if (!prev || prev.id !== id) return prev
      return { ...prev, ...patch, endedAt: new Date() }
    })
  }

  function start(actionId: string, params: Record<string, unknown>): void {
    const id = nextTrialId()
    // 先登记：帧只认登记过的运行（见 `@/stores/run-logs`）
    registerRun(id)
    setRun({
      id,
      name: actionId,
      status: 'running',
      startedAt: new Date(),
      endedAt: null,
      doneSteps: 0,
      result: null,
      error: null
    })

    void (async function () {
      try {
        const result = await itc.sidecar.invoke({ action: actionId, params, runId: id })
        // 单动作就一步：promise 回来即这一步走完，进度计数跟着它，别让它停在 0
        settle(id, { status: 'ok', result, doneSteps: 1 })
      } catch (error) {
        // 失败原因也要在日志里留一行：面板只显示状态，原因得能查
        console.error('[directive] 试跑失败', actionId, error)
        settle(id, { status: 'failed', error: toIpcMessage(error, '试跑失败') })
      }
    })()
  }

  return { run, isRunning: run?.status === 'running', start }
}

export { useTrial }
