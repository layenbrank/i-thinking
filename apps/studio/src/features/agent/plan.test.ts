import { describe, expect, it } from 'vitest'

import { parsePlanItems } from './plan'

/**
 * 计划结果来自模型，形状不可信：可能少字段、status 写了别的词、items 是空数组。
 * 这里断言「不可信就返回 null，不要吐出半截数据给面板渲染」。
 */

describe('parsePlanItems', function () {
  it('reads a well-formed result', function () {
    const actual = parsePlanItems({
      ok: true,
      items: [
        { id: 'todo-1', text: '读 README', status: 'completed' },
        { id: 'todo-2', text: '改代码', status: 'in_progress' }
      ]
    })

    expect(actual).toEqual([
      { id: 'todo-1', text: '读 README', status: 'completed' },
      { id: 'todo-2', text: '改代码', status: 'in_progress' }
    ])
  })

  it('rejects anything that is not an ok result with items', function () {
    expect(parsePlanItems(null)).toBeNull()
    expect(parsePlanItems('todo')).toBeNull()
    expect(parsePlanItems({ ok: false, error: 'boom' })).toBeNull()
    expect(parsePlanItems({ ok: true })).toBeNull()
    expect(parsePlanItems({ ok: true, items: [] })).toBeNull()
  })

  it('fills the missing id and falls back to pending for unknown statuses', function () {
    const actual = parsePlanItems({
      ok: true,
      items: [{ text: '没有 id', status: 'doing' }]
    })

    expect(actual).toEqual([{ id: 'todo-1', text: '没有 id', status: 'pending' }])
  })

  it('drops entries without usable text but keeps the others', function () {
    const actual = parsePlanItems({
      ok: true,
      items: [{ text: '   ' }, { text: '留下我', status: 'pending' }, { text: 42 }]
    })

    expect(actual).toHaveLength(1)
    expect(actual?.[0].text).toBe('留下我')
  })

  it('returns null when nothing usable survives', function () {
    expect(parsePlanItems({ ok: true, items: [{}, { text: '' }] })).toBeNull()
  })
})
