import { describe, expect, it } from 'vitest'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import type { DirectiveRuns } from '../run/run-status'
import { DAY_MS, HOUR_MS, MINUTE_MS } from '../run/run-status'
import { groupDirectives, parseSortMode } from './group'

const NOW = new Date(2026, 0, 8, 12, 0, 0, 0).getTime()

function entry(name: string, bucket: DirectiveEntry['bucket'] = 'system'): DirectiveEntry {
  return { name, path: `${name}.yaml`, bucket, summary: null }
}

function summary(lastAt: Date | null): DirectiveRuns {
  return {
    status: lastAt ? 'ok' : null,
    total: lastAt ? 1 : 0,
    running: 0,
    failed: 0,
    latest: null,
    doneSteps: 0,
    lastAt,
    lastDurationMs: null,
    baseline: null,
    hasUnread: false
  }
}

function namesOf(groups: ReturnType<typeof groupDirectives>, index: number): string[] {
  return groups[index].items.map(function (item) {
    return item.name
  })
}

describe('groupDirectives', function () {
  it('groups by bucket when asked to sort by category', function () {
    const groups = groupDirectives(
      [entry('a', 'ui'), entry('b', null), entry('c', 'ui')],
      {},
      'BUCKET',
      NOW
    )

    expect(
      groups.map(function (group) {
        return group.label
      })
    ).toEqual(['界面', '其他'])
    expect(namesOf(groups, 0)).toEqual(['a', 'c'])
  })

  it('bands by age when asked to sort by recency', function () {
    const summaries = {
      fresh: summary(new Date(NOW - 5 * MINUTE_MS)),
      today: summary(new Date(NOW - 3 * HOUR_MS)),
      week: summary(new Date(NOW - 3 * DAY_MS)),
      old: summary(new Date(NOW - 30 * DAY_MS)),
      never: summary(null)
    }

    const groups = groupDirectives(
      ['fresh', 'today', 'week', 'old', 'never'].map(function (name) {
        return entry(name)
      }),
      summaries,
      'RECENT',
      NOW
    )

    expect(
      groups.map(function (group) {
        return group.key
      })
    ).toEqual(['hour', 'day', 'week', 'earlier', 'never'])
  })

  it('puts the most recent run on top inside a band', function () {
    const summaries = {
      older: summary(new Date(NOW - 50 * MINUTE_MS)),
      newer: summary(new Date(NOW - 2 * MINUTE_MS))
    }

    const groups = groupDirectives([entry('older'), entry('newer')], summaries, 'RECENT', NOW)

    expect(groups).toHaveLength(1)
    expect(namesOf(groups, 0)).toEqual(['newer', 'older'])
  })

  it('drops the bands nothing landed in', function () {
    const groups = groupDirectives([entry('a')], {}, 'RECENT', NOW)

    expect(
      groups.map(function (group) {
        return group.key
      })
    ).toEqual(['never'])
  })

  it('keeps a directive that just crossed the week boundary in the last band', function () {
    const summaries = { a: summary(new Date(NOW - 8 * DAY_MS)) }
    const groups = groupDirectives([entry('a')], summaries, 'RECENT', NOW)

    expect(groups[0].key).toBe('earlier')
  })

  it('treats an hour-old run as today', function () {
    const summaries = { a: summary(new Date(NOW - HOUR_MS)) }
    const groups = groupDirectives([entry('a')], summaries, 'RECENT', NOW)

    expect(groups[0].key).toBe('hour')
  })
})

describe('parseSortMode', function () {
  it('accepts a stored mode', function () {
    expect(parseSortMode('RECENT')).toBe('RECENT')
  })

  it('falls back to the default for a missing or unknown value', function () {
    expect(parseSortMode(null)).toBe('BUCKET')
    expect(parseSortMode('BY_NAME')).toBe('BUCKET')
    expect(parseSortMode('最近执行')).toBe('BUCKET')
  })
})
