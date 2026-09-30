import { describe, expect, it } from 'vitest'

import type { DirectiveEntry } from '@/shared/ipc/specs/sidecar'

import { UNGROUPED_KEY, groupByFolder } from './folder'

/**
 * 分组是 v13 才有的列（`null` = 未分组），列表要能按它铺成一块块。
 * 这里盯住「同名分组一定落在一起、未分组垫底、顺序稳定」。
 */

function entry(name: string, folder: string | null): DirectiveEntry {
  return { name, folder, source: null, updated_at_ms: 0, bucket: null, summary: null }
}

function namesOf(groups: ReturnType<typeof groupByFolder>, index: number): string[] {
  return groups[index].items.map(function (item) {
    return item.name
  })
}

describe('groupByFolder', function () {
  it('collects the same folder and keeps the catalog order inside it', function () {
    const groups = groupByFolder([entry('b', '发布'), entry('a', '发布')])

    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe('发布')
    expect(namesOf(groups, 0)).toEqual(['b', 'a'])
  })

  it('sorts the folders and keeps ungrouped last', function () {
    const groups = groupByFolder([
      entry('c', null),
      entry('b', '整理'),
      entry('a', '发布')
    ])

    expect(
      groups.map(function (group) {
        return group.label
      })
    ).toEqual(['发布', '整理', '未分组'])
    expect(groups[2].key).toBe(UNGROUPED_KEY)
    expect(namesOf(groups, 2)).toEqual(['c'])
  })

  it('gives each group a key that cannot collide with a real folder name', function () {
    const groups = groupByFolder([entry('a', '发布'), entry('b', null)])

    expect(
      groups.map(function (group) {
        return group.key
      })
    ).toEqual(['发布', UNGROUPED_KEY])
  })

  it('drops the groups nothing landed in', function () {
    expect(groupByFolder([])).toEqual([])
  })
})
