import { describe, expect, it } from 'vitest'

import {
  adoptOrphanMarker,
  consumeProgressLines,
  finishOpenRun,
  onLogTruncated,
  type JobEvent,
  type TailState
} from './job-progress-scan'

function emptyState(kind: 'cron' | 'watch' = 'cron'): TailState {
  return {
    runId: '',
    kind,
    name: 'demo',
    offset: 120,
    hasStarted: false
  }
}

describe('onLogTruncated', function () {
  it('截断前补发上一次 end，并清零 offset', function () {
    const events: JobEvent[] = []
    const state = emptyState()
    state.runId = 'job-cron-abc'
    state.hasStarted = true

    onLogTruncated(state, function (event) {
      events.push(event)
    })

    expect(events).toEqual([
      {
        phase: 'end',
        runId: 'job-cron-abc',
        kind: 'cron',
        name: 'demo',
        ok: false,
        error: '进度被新一次触发覆盖'
      }
    ])
    expect(state.offset).toBe(0)
    expect(state.hasStarted).toBe(false)
    expect(state.runId).toBe('')
  })

  it('没有进行中的 run 时只重置 offset', function () {
    const events: JobEvent[] = []
    const state = emptyState()
    onLogTruncated(state, function (event) {
      events.push(event)
    })
    expect(events).toEqual([])
    expect(state.offset).toBe(0)
  })
})

describe('adoptOrphanMarker', function () {
  it('走 beginRun：发 start 并挂上 runId', function () {
    const events: JobEvent[] = []
    const state = emptyState()
    adoptOrphanMarker(state, { run_id: 'orphan-1', name: 'demo' }, 'demo', function (event) {
      events.push(event)
    })
    expect(events).toEqual([
      {
        phase: 'start',
        runId: 'job-cron-orphan-1',
        kind: 'cron',
        name: 'demo'
      }
    ])
    expect(state.hasStarted).toBe(true)
    expect(state.runId).toBe('job-cron-orphan-1')
  })
})

describe('consumeProgressLines', function () {
  it('同轮内 start → progress → end 顺序推送', function () {
    const events: JobEvent[] = []
    const state = emptyState()
    const chunk = [
      JSON.stringify({ phase: 'start', run_id: 'r1', name: 'demo' }),
      JSON.stringify({
        phase: 'progress',
        progress: { kind: 'step_start', step: 's1', action: 'shell.run', seq: 1 }
      }),
      JSON.stringify({
        phase: 'progress',
        progress: {
          kind: 'step_end',
          step: 's1',
          action: 'shell.run',
          took_ms: 10,
          ok: true
        }
      }),
      JSON.stringify({ phase: 'end', run_id: 'r1', name: 'demo', ok: true })
    ].join('\n')

    consumeProgressLines(state, chunk, function (event) {
      events.push(event)
    }, 'demo')

    expect(
      events.map(function (event) {
        return event.phase
      })
    ).toEqual(['start', 'progress', 'progress', 'end'])
    expect(events[0]).toMatchObject({
      phase: 'start',
      runId: 'job-cron-r1',
      kind: 'cron',
      name: 'demo'
    })
    expect(events[1]).toMatchObject({
      phase: 'progress',
      runId: 'job-cron-r1',
      progress: { kind: 'step_start', step: 's1' }
    })
    expect(events[3]).toMatchObject({ phase: 'end', ok: true })
    expect(state.hasStarted).toBe(false)
  })

  it('忽略 heartbeat', function () {
    const events: JobEvent[] = []
    const state = emptyState()
    state.runId = 'job-cron-r1'
    state.hasStarted = true
    consumeProgressLines(
      state,
      JSON.stringify({
        phase: 'progress',
        progress: { kind: 'heartbeat', is_queued: false }
      }),
      function (event) {
        events.push(event)
      },
      'demo'
    )
    expect(events).toEqual([])
  })
})

describe('finishOpenRun', function () {
  it('无 open run 时不发事件', function () {
    const events: JobEvent[] = []
    finishOpenRun(emptyState(), function (event) {
      events.push(event)
    }, 'x')
    expect(events).toEqual([])
  })
})
