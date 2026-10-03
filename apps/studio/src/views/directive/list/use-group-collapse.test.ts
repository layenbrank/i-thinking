import { describe, expect, it } from 'vitest'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import { NEVER_AUTO_COLLAPSE, seedOpen } from './use-group-collapse'
import type { DirectiveGroup } from './types'

function entry(name: string): DirectiveEntry {
  return {
    name,
    folder: null,
    source: null,
    visible: true,
    updated_at_ms: 0,
    bucket: null,
    summary: null
  }
}

function group(key: string, count: number): DirectiveGroup {
  return {
    key,
    label: key,
    icon: 'mdi:folder',
    items: Array.from({ length: count }, function (_, i) {
      return entry(`${key}-${i}`)
    })
  }
}

describe('seedOpen', function () {
  it('默认全部展开', function () {
    const open = seedOpen([group('hour', 2), group('day', 2)])
    expect(open.hour).toBe(true)
    expect(open.day).toBe(true)
  })

  it('未运行过多且有其它组时默认收起', function () {
    const open = seedOpen([
      group('hour', 2),
      group('never', NEVER_AUTO_COLLAPSE + 1)
    ])
    expect(open.hour).toBe(true)
    expect(open.never).toBe(false)
  })

  it('只有未运行一组时不收起', function () {
    const open = seedOpen([group('never', NEVER_AUTO_COLLAPSE + 1)])
    expect(open.never).toBe(true)
  })

  it('未运行未超阈值时不收起', function () {
    const open = seedOpen([group('hour', 1), group('never', NEVER_AUTO_COLLAPSE)])
    expect(open.never).toBe(true)
  })
})
