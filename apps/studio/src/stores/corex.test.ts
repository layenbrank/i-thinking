import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CorexFrame } from '@/stores/run-logs'
import { appendRunFrame, findRunFrames, flushRunFrames } from '@/stores/run-logs'

import { useCorexStore } from './corex'

/**
 * 淘汰是长期挂机时唯一会走到的路径：跑够一百次之后，最早结束的那条要被丢掉。
 *
 * 帧不在这个 store 里（见 `./run-logs`），所以「丢掉的运行」必须连带回收它的帧缓冲 ——
 * 漏掉这一句，界面看着干干净净，内存却一条不落全都留着。
 */

const MAX_FINISHED_RUNS = 100
const AT = new Date(2026, 0, 1, 12, 0, 0, 0)

function frame(runId: string): CorexFrame {
  return {
    kind: 'step_output',
    runId,
    step: 'step-1',
    action: 'shell.run',
    stream: 'stdout',
    text: runId,
    receivedAt: AT
  }
}

/** 起一次运行、给它一帧、等它跑完（stub 的 run 立刻返回） */
async function finishRun(name: string): Promise<string> {
  const id = useCorexStore.getState().startRun(name, {})
  appendRunFrame(frame(id))
  flushRunFrames()
  await Promise.resolve()
  return id
}

function stubRun(name: string): void {
  vi.stubGlobal('itc', {
    sidecar: {
      run: function (request: { name: string }) {
        // 长跑任务：corex 到测试结束都没回，宿主这边就该一直当它还在跑
        return request.name === name ? new Promise(function () {}) : Promise.resolve({ ok: true })
      }
    },
    store: {
      toRead: async function () {
        return undefined
      },
      toWrite: async function () {
        return undefined
      }
    }
  })
}

beforeEach(function () {
  useCorexStore.setState({ runs: [], seenAt: {} })
})

afterEach(function () {
  vi.unstubAllGlobals()
})

describe('runs', function () {
  it('drops the frames of the runs it evicts', async function () {
    stubRun('long')
    const first = await finishRun('demo')
    // 先确认帧真落了地，否则下面「帧没了」证明不了是回收干的
    expect(findRunFrames(first).frames).toHaveLength(1)

    for (let i = 0; i < MAX_FINISHED_RUNS; i += 1) {
      await finishRun('demo')
    }

    const { runs } = useCorexStore.getState()
    expect(runs).toHaveLength(MAX_FINISHED_RUNS)
    expect(
      runs.some(function (run) {
        return run.id === first
      })
    ).toBe(false)
    expect(findRunFrames(first).frames).toHaveLength(0)
  })

  it('keeps a run that is still going, however many finished ones pile up', async function () {
    stubRun('long')
    const alive = useCorexStore.getState().startRun('long', {})

    for (let i = 0; i < MAX_FINISHED_RUNS + 1; i += 1) {
      await finishRun('demo')
    }

    const { runs } = useCorexStore.getState()
    expect(runs).toHaveLength(MAX_FINISHED_RUNS + 1)
    expect(runs[0].id).toBe(alive)
  })
})
