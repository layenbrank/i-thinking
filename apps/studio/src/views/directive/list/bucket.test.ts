import { describe, expect, it } from 'vitest'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import { findBucketMark, groupByBucket } from './bucket'

function entry(name: string, bucket: DirectiveEntry['bucket']): DirectiveEntry {
  return { name, path: `${name}.yaml`, bucket, summary: null }
}

describe('groupByBucket', function () {
  it('orders groups by the bucket list, unclassified last', function () {
    const groups = groupByBucket([
      entry('c', null),
      entry('b', 'ui'),
      entry('a', 'system'),
      entry('d', 'plugin')
    ])

    expect(
      groups.map(function (group) {
        return group.label
      })
    ).toEqual(['系统', '界面', '插件', '其他'])
  })

  it('drops the groups nothing landed in', function () {
    expect(groupByBucket([entry('a', 'data')])).toHaveLength(1)
    expect(groupByBucket([])).toEqual([])
  })

  it('keeps the order the catalog came in inside a group', function () {
    const groups = groupByBucket([entry('b', 'ui'), entry('a', 'ui')])

    expect(
      groups[0].items.map(function (item) {
        return item.name
      })
    ).toEqual(['b', 'a'])
  })

  it('keeps an entry whose bucket it cannot read, under 其他', function () {
    const groups = groupByBucket([entry('a', 'nope' as DirectiveEntry['bucket'])])

    expect(groups).toHaveLength(1)
    expect(groups[0].key).toBe('other')
    expect(groups[0].items.map(function (item) {
      return item.name
    })).toEqual(['a'])
  })

  it('names every group with a stable key', function () {
    const groups = groupByBucket([entry('a', 'system'), entry('c', null)])

    expect(
      groups.map(function (group) {
        return group.key
      })
    ).toEqual(['system', 'other'])
  })
})

describe('findBucketMark', function () {
  it('gives every bucket its own icon', function () {
    const marks = (['system', 'network', 'data', 'ui', 'logic', 'plugin'] as const).map(
      findBucketMark
    )

    expect(
      new Set(
        marks.map(function (mark) {
          return mark.icon
        })
      ).size
    ).toBe(marks.length)
  })

  it('falls back to the unclassified mark, not to plugin', function () {
    expect(findBucketMark(null)).toEqual(findBucketMark(undefined))
    expect(findBucketMark('nope')).toEqual(findBucketMark(null))
    expect(findBucketMark(null).label).toBe('其他')
  })

  it('marks a bucket like the group it lands in', function () {
    const group = groupByBucket([entry('a', 'logic')])[0]

    expect(findBucketMark(group.key)).toEqual({ label: group.label, icon: group.icon })
  })
})
