import { describe, expect, it } from 'vitest'

import type { DirectiveRun } from '@/shared/ipc/specs/sidecar'
import type { CorexRun } from '@/stores/corex'

import {
  DAY_MS,
  HOUR_MS,
  formatAbsoluteTime,
  formatDuration,
  formatElapsed,
  formatRelativeTime,
  indexLastRuns,
  indexRunSummaries,
  indexStepCounts
} from './run-status'

const AT = new Date(2026, 0, 1, 12, 0, 0, 0)

function run(partial: Partial<CorexRun> & Pick<CorexRun, 'id'>): CorexRun {
  return {
    name: 'build-intern',
    status: 'ok',
    startedAt: AT,
    endedAt: AT,
    doneSteps: 0,
    result: null,
    error: null,
    ...partial
  }
}

/** corex 账本里的一条，只填这些用例关心的字段 */
function ledger(partial: Partial<DirectiveRun> = {}): DirectiveRun {
  return {
    started_at_ms: AT.getTime(),
    ended_at_ms: AT.getTime() + 1200,
    ok: true,
    duration_ms: 1200,
    run_count: 1,
    failed_count: 0,
    ...partial
  }
}

describe('indexRunSummaries', function () {
  it('leaves a directive that never ran out of the index', function () {
    const actual = indexRunSummaries([run({ id: 'a', name: 'other' })], {})

    expect(actual['build-intern']).toBeUndefined()
  })

  it('shows running as long as any task of that directive is alive', function () {
    const actual = indexRunSummaries(
      [
        run({ id: 'a', status: 'failed' }),
        run({ id: 'b', status: 'running', endedAt: null, doneSteps: 1 })
      ],
      {}
    )['build-intern']

    expect(actual.status).toBe('running')
    expect(actual.total).toBe(2)
    expect(actual.running).toBe(1)
    expect(actual.failed).toBe(1)
    expect(actual.doneSteps).toBe(1)
  })

  it('falls back to the newest finished task and counts its steps', function () {
    const actual = indexRunSummaries(
      [
        run({ id: 'a', status: 'ok', doneSteps: 2 }),
        run({ id: 'b', status: 'failed', doneSteps: 1 })
      ],
      {}
    )['build-intern']

    expect(actual.status).toBe('failed')
    expect(actual.latest?.id).toBe('b')
    expect(actual.doneSteps).toBe(1)
    expect(actual.lastAt).toEqual(AT)
  })

  it('marks a finished task unread until the moment it was seen', function () {
    const items = [run({ id: 'a', endedAt: AT })]

    expect(indexRunSummaries(items, {})['build-intern'].hasUnread).toBe(true)
    expect(
      indexRunSummaries(items, { 'build-intern': AT.getTime() })['build-intern'].hasUnread
    ).toBe(false)
    expect(
      indexRunSummaries(items, { 'build-intern': AT.getTime() + 1 })['build-intern'].hasUnread
    ).toBe(false)
  })

  it('never marks a task that is still running as unread', function () {
    const actual = indexRunSummaries([run({ id: 'a', status: 'running', endedAt: null })], {})[
      'build-intern'
    ]

    expect(actual.hasUnread).toBe(false)
  })

  it('keeps the unread dot while a newer task runs over an unseen result', function () {
    const actual = indexRunSummaries(
      [run({ id: 'a', endedAt: AT }), run({ id: 'b', status: 'running', endedAt: null })],
      { 'build-intern': AT.getTime() - 1 }
    )['build-intern']

    expect(actual.hasUnread).toBe(true)
  })

  it('keeps directives apart', function () {
    const actual = indexRunSummaries(
      [
        run({ id: 'a', name: 'one', status: 'failed' }),
        run({ id: 'b', name: 'two', status: 'ok' })
      ],
      {}
    )

    expect(actual.one.status).toBe('failed')
    expect(actual.two.status).toBe('ok')
  })
})

describe('indexRunSummaries with the corex ledger', function () {
  it('lends the ledger to a directive this session never ran', function () {
    const actual = indexRunSummaries([], {}, { 'build-intern': ledger() })['build-intern']

    expect(actual.status).toBe('ok')
    expect(actual.total).toBe(0)
    expect(actual.lastAt).toEqual(AT)
    expect(actual.lastDurationMs).toBe(1200)
    expect(actual.baseline).toEqual(ledger())
  })

  it('reads a failed ledger run as failed', function () {
    const actual = indexRunSummaries([], {}, {
      'build-intern': ledger({ ok: false, error: '炸了' })
    })['build-intern']

    expect(actual.status).toBe('failed')
  })

  it('prefers the session over a stale ledger entry once both know the directive', function () {
    const actual = indexRunSummaries([run({ id: 'a', status: 'failed' })], {}, {
      'build-intern': ledger()
    })['build-intern']

    expect(actual.status).toBe('failed')
    expect(actual.latest?.id).toBe('a')
    expect(actual.lastDurationMs).toBe(0)
  })

  it('counts a ledger result that was never seen as unread', function () {
    // 账本那条是 12:00:01.2 结束的 —— 只在 12:00:00 看过，圆点就该亮着
    const seen = { 'build-intern': AT.getTime() }
    const read = { 'build-intern': ledger().ended_at_ms }

    expect(indexRunSummaries([], {}, { 'build-intern': ledger() })['build-intern'].hasUnread).toBe(
      true
    )
    expect(
      indexRunSummaries([], seen, { 'build-intern': ledger() })['build-intern'].hasUnread
    ).toBe(true)
    expect(
      indexRunSummaries([], read, { 'build-intern': ledger() })['build-intern'].hasUnread
    ).toBe(false)
  })

  it('lets a running task win over the ledger', function () {
    const actual = indexRunSummaries(
      [run({ id: 'a', status: 'running', endedAt: null })],
      {},
      { 'build-intern': ledger() }
    )['build-intern']

    expect(actual.status).toBe('running')
    expect(actual.lastDurationMs).toBeNull()
  })
})

describe('indexLastRuns', function () {
  it('flattens the ledger out of the catalog and skips directives that never ran', function () {
    const actual = indexLastRuns([
      { name: 'build-intern', path: 'a.yaml', bucket: null, summary: null, last_run: ledger() },
      { name: 'fresh', path: 'b.yaml', bucket: null, summary: null }
    ])

    expect(Object.keys(actual)).toEqual(['build-intern'])
  })
})

describe('formatDuration', function () {
  it('uses the same scale as a live task does', function () {
    expect(formatDuration(320)).toBe('320ms')
    expect(formatDuration(13_100)).toBe('13.1s')
    expect(formatDuration(63_000)).toBe('1m03s')
  })
})

describe('indexStepCounts', function () {
  it('maps a directive name to the step count corex declared', function () {
    const actual = indexStepCounts([
      {
        name: 'build-intern',
        path: 'x.yaml',
        bucket: 'system',
        summary: { description: '', step_count: 3, input_count: 0, trigger_count: 0 }
      },
      { name: 'broken', path: 'y.yaml', bucket: null, summary: null }
    ])

    expect(actual).toEqual({ 'build-intern': 3, broken: 0 })
  })
})

describe('formatElapsed', function () {
  it('keeps sub-second runs in milliseconds', function () {
    const ended = run({ id: 'a', endedAt: new Date(AT.getTime() + 320) })

    expect(formatElapsed(ended)).toBe('320ms')
  })

  it('shows seconds with one decimal up to a minute', function () {
    const ended = run({ id: 'a', endedAt: new Date(AT.getTime() + 13_100) })

    expect(formatElapsed(ended)).toBe('13.1s')
  })

  it('switches to minutes and seconds after that', function () {
    const ended = run({ id: 'a', endedAt: new Date(AT.getTime() + 63_000) })

    expect(formatElapsed(ended)).toBe('1m03s')
  })

  it('measures a live task against the given moment', function () {
    const live = run({ id: 'a', status: 'running', endedAt: null })

    expect(formatElapsed(live, AT.getTime() + 5000)).toBe('5.0s')
  })
})

describe('formatRelativeTime', function () {
  it('rounds the first minute down to 刚刚', function () {
    expect(formatRelativeTime(AT, AT.getTime() + 30_000)).toBe('刚刚')
  })

  it('counts minutes, hours and days', function () {
    expect(formatRelativeTime(AT, AT.getTime() + 5 * 60_000)).toBe('5 分钟前')
    expect(formatRelativeTime(AT, AT.getTime() + 3 * HOUR_MS)).toBe('3 小时前')
    expect(formatRelativeTime(AT, AT.getTime() + 2 * DAY_MS)).toBe('2 天前')
  })

  it('switches to a date once it is more than a week old', function () {
    expect(formatRelativeTime(AT, AT.getTime() + 8 * DAY_MS)).toBe('1月1日')
  })

  it('treats a clock that went backwards as 刚刚 instead of a negative age', function () {
    expect(formatRelativeTime(AT, AT.getTime() - 60_000)).toBe('刚刚')
  })
})

describe('formatAbsoluteTime', function () {
  it('prints a local timestamp with zero padding', function () {
    expect(formatAbsoluteTime(new Date(2026, 0, 2, 9, 5, 7))).toBe('2026-01-02 09:05:07')
  })
})
