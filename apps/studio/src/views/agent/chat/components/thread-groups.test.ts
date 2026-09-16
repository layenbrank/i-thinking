import { describe, expect, it } from 'vitest'

import {
  UNBOUND_GROUP_ID,
  groupThreadsByWorkspace,
  type ThreadEntry
} from './thread-groups'

/**
 * 分组的风险点是「会话会不会掉出列表」：工作区被删、区没有会话、组顺序抖。
 * 这里按「每条会话都恰好出现一次」来断言。
 */

const WORKSPACES = [
  { id: 'ws-a', title: 'alpha' },
  { id: 'ws-b', title: 'beta' }
]

function entry(index: number, workspaceID: string | null): ThreadEntry {
  return { index, workspaceID, title: `t${index}` }
}

describe('groupThreadsByWorkspace', function () {
  it('puts the active workspace first, then the rest in list order, then unbound', function () {
    const actual = groupThreadsByWorkspace(
      [entry(0, 'ws-b'), entry(1, 'ws-a'), entry(2, null)],
      WORKSPACES,
      'ws-b'
    )

    expect(
      actual.map(function (group) {
        return group.id
      })
    ).toEqual(['ws-b', 'ws-a', UNBOUND_GROUP_ID])
    expect(
      actual.map(function (group) {
        return group.label
      })
    ).toEqual(['beta', 'alpha', '未关联工作区'])
  })

  it('keeps the incoming order inside a group', function () {
    const actual = groupThreadsByWorkspace(
      [entry(5, 'ws-a'), entry(2, 'ws-a'), entry(9, 'ws-a')],
      WORKSPACES,
      'ws-b'
    )

    expect(actual).toHaveLength(1)
    expect(actual[0].indices).toEqual([5, 2, 9])
  })

  it('treats a thread whose workspace is gone as unbound', function () {
    const actual = groupThreadsByWorkspace([entry(0, 'ws-zzz')], WORKSPACES, null)

    expect(actual).toEqual([{ id: UNBOUND_GROUP_ID, label: '未关联工作区', indices: [0] }])
  })

  it('omits empty groups', function () {
    const actual = groupThreadsByWorkspace([entry(0, 'ws-b')], WORKSPACES, null)

    expect(
      actual.map(function (group) {
        return group.id
      })
    ).toEqual(['ws-b'])
  })

  it('returns nothing for no entries', function () {
    expect(groupThreadsByWorkspace([], WORKSPACES, 'ws-a')).toEqual([])
  })

  it('visits every entry exactly once', function () {
    const entries = [entry(0, 'ws-a'), entry(1, null), entry(2, 'ws-b'), entry(3, 'gone')]
    const actual = groupThreadsByWorkspace(entries, WORKSPACES, 'ws-a')

    const seen = actual
      .flatMap(function (group) {
        return group.indices
      })
      .toSorted(function (a, b) {
        return a - b
      })
    expect(seen).toEqual([0, 1, 2, 3])
  })

  it('handles an empty workspace list', function () {
    const actual = groupThreadsByWorkspace([entry(0, 'ws-a'), entry(1, null)], [], 'ws-a')

    expect(actual).toEqual([{ id: UNBOUND_GROUP_ID, label: '未关联工作区', indices: [0, 1] }])
  })
})
