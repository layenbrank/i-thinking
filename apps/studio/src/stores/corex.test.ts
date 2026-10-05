import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { DirectiveContent } from '@/shared/ipc/specs/sidecar'
import type { CorexFrame } from '@/stores/run-logs'
import { appendRunFrame, findRunFrames, flushRunFrames, registerRun } from '@/stores/run-logs'

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
  useCorexStore.setState({
    runs: [],
    seenAt: {},
    isLoaded: false,
    isLoading: false,
    loadError: null,
    focusRunId: null
  })
})

afterEach(function () {
  vi.unstubAllGlobals()
})

/** 只留被测方法要碰的那几个频道；其余调用出现即报错，免得测试悄悄依赖了没桩的东西 */
function stubSidecar(handlers: Record<string, (...args: unknown[]) => unknown>): void {
  vi.stubGlobal('itc', {
    sidecar: handlers,
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

describe('directives', function () {
  function content(name: string): DirectiveContent {
    return { name, description: '', version: '', inputs: [], steps: [] }
  }

  it('passes the original name so a rename leaves no orphan behind', async function () {
    const calls: unknown[] = []
    stubSidecar({
      saveDirective: function (input: unknown) {
        calls.push(input)
        return { name: 'renamed', definition: content('renamed') }
      }
    })

    await useCorexStore.getState().saveDirective(content('renamed'), 'old')

    expect(calls).toEqual([{ definition: content('renamed'), original_name: 'old' }])
  })

  it('leaves original_name out when the name did not change', async function () {
    const calls: unknown[] = []
    stubSidecar({
      saveDirective: function (input: unknown) {
        calls.push(input)
        return { name: 'same', definition: content('same') }
      }
    })

    await useCorexStore.getState().saveDirective(content('same'))

    expect(calls).toEqual([{ definition: content('same') }])
  })

  it('forwards delete and import to the daemon', async function () {
    const calls: unknown[] = []
    stubSidecar({
      deleteDirective: function (input: unknown) {
        calls.push(['delete', input])
        return { name: 'gone' }
      },
      importDirectives: function (input: unknown) {
        calls.push(['import', input])
        return { entries: [], created: 0, updated: 0, skipped: 0, failed: 0 }
      }
    })

    await useCorexStore.getState().deleteDirective('gone')
    await useCorexStore.getState().importDirectives({ path: 'D:\\y', is_overwrite: true })

    expect(calls).toEqual([
      ['delete', { name: 'gone' }],
      ['import', { path: 'D:\\y', is_overwrite: true }]
    ])
  })
})

describe('runs', function () {
  it('replaces a finished run of the same name instead of stacking tabs', async function () {
    stubSidecar({
      run: function () {
        return Promise.resolve({ ok: true })
      }
    })

    const first = await finishRun('demo')
    expect(findRunFrames(first).frames).toHaveLength(1)

    const second = await finishRun('demo')
    const { runs } = useCorexStore.getState()

    expect(second).not.toBe(first)
    expect(runs).toHaveLength(1)
    expect(runs[0].id).toBe(second)
    expect(findRunFrames(first).frames).toHaveLength(0)
  })

  it('reuses the alive run when the same name is started again', function () {
    stubRun('long')
    const first = useCorexStore.getState().startRun('long', {})
    const again = useCorexStore.getState().startRun('long', { x: 1 })

    expect(again).toBe(first)
    expect(useCorexStore.getState().runs).toHaveLength(1)
  })

  it('守护触发复用同名已结束的单次选项卡', async function () {
    type JobHandler = (event: {
      phase: string
      runId: string
      kind: 'cron' | 'watch'
      name: string
      ok?: boolean
      error?: string
    }) => void
    let onJob: JobHandler = function () {}

    stubSidecar({
      onProgress: function () {
        return function () {}
      },
      onJobEvent: function (handler: unknown) {
        onJob = handler as JobHandler
        return function () {}
      },
      actions: async function () {
        return []
      },
      directives: async function () {
        return []
      },
      run: function () {
        return Promise.resolve({ ok: true })
      }
    })

    await useCorexStore.getState().initialize()
    const once = await finishRun('build-intern')
    expect(useCorexStore.getState().runs).toHaveLength(1)
    const seat = 0

    onJob({
      phase: 'start',
      runId: 'job-watch-1',
      kind: 'watch',
      name: 'build-intern'
    })
    const { runs } = useCorexStore.getState()
    expect(runs).toHaveLength(1)
    expect(runs[seat].id).toBe('job-watch-1')
    expect(runs[seat].trigger).toBe('watch')
    expect(findRunFrames(once).frames).toHaveLength(0)
  })

  it('守护触发不抢还在跑的单次选项卡', async function () {
    type JobHandler = (event: {
      phase: string
      runId: string
      kind: 'cron' | 'watch'
      name: string
    }) => void
    let onJob: JobHandler = function () {}

    stubSidecar({
      onProgress: function () {
        return function () {}
      },
      onJobEvent: function (handler: unknown) {
        onJob = handler as JobHandler
        return function () {}
      },
      actions: async function () {
        return []
      },
      directives: async function () {
        return []
      },
      run: function () {
        return new Promise(function () {})
      }
    })
    await useCorexStore.getState().initialize()
    const once = useCorexStore.getState().startRun('build-intern', {})
    expect(useCorexStore.getState().runs[0].id).toBe(once)

    onJob({
      phase: 'start',
      runId: 'job-watch-2',
      kind: 'watch',
      name: 'build-intern'
    })
    const { runs } = useCorexStore.getState()
    expect(runs).toHaveLength(1)
    expect(runs[0].id).toBe(once)
    expect(runs[0].trigger).toBeUndefined()
    expect(useCorexStore.getState().focusRunId).toBe(once)
  })

  it('drops the frames of the runs it evicts', async function () {
    stubRun('long')
    const first = await finishRun('demo-0')
    // 先确认帧真落了地，否则下面「帧没了」证明不了是回收干的
    expect(findRunFrames(first).frames).toHaveLength(1)

    // 淘汰按「已结束条数」掐，得用不同名字 —— 同名重跑会直接换掉旧的，到不了上限
    for (let i = 1; i <= MAX_FINISHED_RUNS; i += 1) {
      await finishRun(`demo-${i}`)
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
      await finishRun(`demo-${i}`)
    }

    const { runs } = useCorexStore.getState()
    expect(runs).toHaveLength(MAX_FINISHED_RUNS + 1)
    expect(runs[0].id).toBe(alive)
  })

  it('markTriggerStopping 只标守护触发中的运行', function () {
    useCorexStore.setState({
      runs: [
        {
          id: 'job-1',
          name: 'demo',
          status: 'running',
          startedAt: AT,
          endedAt: null,
          doneSteps: 0,
          result: null,
          error: null,
          trigger: 'cron'
        },
        {
          id: 'run-manual',
          name: 'demo',
          status: 'running',
          startedAt: AT,
          endedAt: null,
          doneSteps: 0,
          result: null,
          error: null
        }
      ]
    })

    useCorexStore.getState().markTriggerStopping('demo', 'cron')
    const { runs } = useCorexStore.getState()
    expect(runs.find(function (run) {
      return run.id === 'job-1'
    })?.isStopping).toBe(true)
    expect(runs.find(function (run) {
      return run.id === 'run-manual'
    })?.isStopping).toBeUndefined()
  })

  it('cancelTriggerRuns 标失败并停收帧', function () {
    const id = 'job-cron-x'
    useCorexStore.setState({
      runs: [
        {
          id,
          name: 'demo',
          status: 'running',
          startedAt: AT,
          endedAt: null,
          doneSteps: 1,
          result: null,
          error: null,
          trigger: 'cron',
          isStopping: true
        }
      ]
    })
    registerRun(id)
    appendRunFrame(frame(id))
    flushRunFrames()
    expect(findRunFrames(id).frames).toHaveLength(1)

    useCorexStore.getState().cancelTriggerRuns('demo', 'cron')
    const run = useCorexStore.getState().runs[0]
    expect(run.status).toBe('failed')
    expect(run.error).toBe('已强制终止')
    expect(run.isStopping).toBe(false)
    expect(findRunFrames(id).frames).toHaveLength(1)

    appendRunFrame(frame(id))
    flushRunFrames()
    expect(findRunFrames(id).frames).toHaveLength(1)
  })

  it('JOB_EVENT end 会先落地还在缓冲里的帧', async function () {
    type JobHandler = (event: {
      phase: string
      runId: string
      kind: 'cron' | 'watch'
      name: string
      ok?: boolean
      error?: string
    }) => void
    let onJob: JobHandler = function () {}

    stubSidecar({
      onProgress: function () {
        return function () {}
      },
      onJobEvent: function (handler: unknown) {
        onJob = handler as JobHandler
        return function () {}
      },
      actions: async function () {
        return []
      },
      directives: async function () {
        return []
      }
    })

    await useCorexStore.getState().initialize()
    onJob({ phase: 'start', runId: 'job-watch-flush', kind: 'watch', name: 'demo' })
    appendRunFrame(frame('job-watch-flush'))
    onJob({
      phase: 'end',
      runId: 'job-watch-flush',
      kind: 'watch',
      name: 'demo',
      ok: true
    })

    expect(findRunFrames('job-watch-flush').frames).toHaveLength(1)
    expect(useCorexStore.getState().runs[0].status).toBe('ok')
  })

  it('迟到的 JOB_EVENT end 不覆盖已强制终止', async function () {
    type JobHandler = (event: {
      phase: string
      runId: string
      kind: 'cron' | 'watch'
      name: string
      ok?: boolean
      error?: string
    }) => void
    let onJob: JobHandler = function () {}

    stubSidecar({
      onProgress: function () {
        return function () {}
      },
      onJobEvent: function (handler: unknown) {
        onJob = handler as JobHandler
        return function () {}
      },
      actions: async function () {
        return []
      },
      directives: async function () {
        return []
      }
    })

    await useCorexStore.getState().initialize()
    onJob({ phase: 'start', runId: 'job-cron-1', kind: 'cron', name: 'demo' })
    useCorexStore.getState().cancelTriggerRuns('demo', 'cron')
    onJob({
      phase: 'end',
      runId: 'job-cron-1',
      kind: 'cron',
      name: 'demo',
      ok: false,
      error: '进度中断'
    })

    const run = useCorexStore.getState().runs[0]
    expect(run.status).toBe('failed')
    expect(run.error).toBe('已强制终止')
  })
})
