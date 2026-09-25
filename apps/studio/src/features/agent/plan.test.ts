import type { ThreadMessage } from '@assistant-ui/react'
import { describe, expect, it } from 'vitest'

import { findLatestPlan, parsePlanItems } from './plan'

/**
 * 计划来源是模型自己写的 markdown 正文，形状不可信：可能没有任务行、
 * 缩进/列表符不同、勾选框里写了别的字符。这里断言「捞不到就返回 null，
 * 不要吐出半截数据给面板渲染」。
 */

describe('parsePlanItems', function () {
  it('reads markdown task lines and their state', function () {
    const actual = parsePlanItems(
      ['先看一下现状：', '- [x] 读 README', '* [ ] 改代码', '  + [X] 跑测试'].join('\n')
    )

    expect(actual).toEqual([
      { id: 'todo-1', text: '读 README', status: 'completed' },
      { id: 'todo-2', text: '改代码', status: 'pending' },
      { id: 'todo-3', text: '跑测试', status: 'completed' }
    ])
  })

  it('ignores ordinary bullets and blank checkbox labels', function () {
    const actual = parsePlanItems(
      ['- 只是列表', '- [ ]', '- [ ] 留下我', '- [] 不是任务行'].join('\n')
    )

    expect(actual).toEqual([{ id: 'todo-1', text: '留下我', status: 'pending' }])
  })

  it('returns null when there is no task line', function () {
    expect(parsePlanItems('')).toBeNull()
    expect(parsePlanItems('没有任何清单的一段话。')).toBeNull()
    expect(parsePlanItems('- 普通列表\n- 另一项')).toBeNull()
  })
})

function toAssistantMessage(...texts: string[]): ThreadMessage {
  return {
    id: 'message-1',
    role: 'assistant',
    content: texts.map(function (text) {
      return { type: 'text', text }
    }),
    createdAt: new Date(0),
    status: { type: 'complete', reason: 'stop' }
  } as unknown as ThreadMessage
}

describe('findLatestPlan', function () {
  it('counts the completed items of the last plan in the conversation', function () {
    const messages = [
      toAssistantMessage('- [ ] 旧的计划'),
      toAssistantMessage('- [x] 读 README\n- [ ] 改代码')
    ]

    expect(findLatestPlan(messages)).toEqual({
      items: [
        { id: 'todo-1', text: '读 README', status: 'completed' },
        { id: 'todo-2', text: '改代码', status: 'pending' }
      ],
      done: 1,
      total: 2
    })
  })

  it('takes the last plan when one message rewrites it in a later part', function () {
    const messages = [toAssistantMessage('- [ ] 第一版\n- [ ] 第一条', '- [x] 第二版')]

    expect(findLatestPlan(messages)?.items).toEqual([
      { id: 'todo-1', text: '第二版', status: 'completed' }
    ])
  })

  it('skips messages without a plan and messages that are not from the assistant', function () {
    const messages = [
      { ...toAssistantMessage('- [ ] 用户手写的清单'), role: 'user' } as unknown as ThreadMessage,
      toAssistantMessage('这一条没有清单'),
      toAssistantMessage('- [x] 真正的计划')
    ]

    expect(findLatestPlan(messages)?.items).toEqual([
      { id: 'todo-1', text: '真正的计划', status: 'completed' }
    ])
  })

  it('returns null when no message carries a plan', function () {
    expect(findLatestPlan([])).toBeNull()
    expect(findLatestPlan([toAssistantMessage('随便聊两句')])).toBeNull()
  })
})
