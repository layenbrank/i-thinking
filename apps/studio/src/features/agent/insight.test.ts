import type { ThreadMessage } from '@assistant-ui/react'
import { describe, expect, it } from 'vitest'

import { collectReferences, findLastActivityAt, findRunPhase, summarizeToolCalls } from './insight'

/**
 * 右栏全靠这些派生量说话：阶段说错会让人干等，工具统计说错会与折叠条对不上。
 * 边界（空会话、审批中、上一轮的旧状态）都要有确定答案。
 */

function toMessage(
  role: 'user' | 'assistant',
  content: unknown[],
  createdAt = new Date(0)
): ThreadMessage {
  return { id: `message-${role}`, role, content, createdAt } as unknown as ThreadMessage
}

function toolCall(overrides: Record<string, unknown>): unknown {
  return { type: 'tool-call', toolCallId: 'call-1', toolName: 'read', argsText: '{}', ...overrides }
}

describe('collectReferences', function () {
  it('takes file parts from user messages and dedupes them', function () {
    const messages = [
      toMessage('user', [
        { type: 'file', filename: 'a.ts' },
        { type: 'file', filename: 'a.ts' },
        { type: 'image', filename: 'shot.png' }
      ]),
      toMessage('user', [{ type: 'file', filename: 'b.ts' }])
    ]

    expect(collectReferences(messages)).toEqual(['a.ts', 'shot.png', 'b.ts'])
  })

  it('ignores assistant parts and nameless files', function () {
    const messages = [
      toMessage('assistant', [{ type: 'file', filename: 'a.ts' }]),
      toMessage('user', [{ type: 'file' }, { type: 'text', text: '看这个' }])
    ]

    expect(collectReferences(messages)).toEqual([])
  })
})

describe('findRunPhase', function () {
  it('is idle when nothing is running', function () {
    expect(findRunPhase([], false)).toEqual({ kind: 'idle', label: '就绪' })
  })

  it('thinks while a run has produced nothing yet', function () {
    expect(findRunPhase([], true)).toEqual({ kind: 'thinking', label: '思考中' })
  })

  it('reports the running text part as writing', function () {
    const messages = [
      toMessage('assistant', [
        { type: 'reasoning', text: '想一下', status: { type: 'complete' } },
        { type: 'text', text: '答案是', status: { type: 'running' } }
      ])
    ]

    expect(findRunPhase(messages, true)).toEqual({ kind: 'writing', label: '输出中' })
  })

  it('reports a tool call without a result as the current step', function () {
    const messages = [
      toMessage('assistant', [
        { type: 'text', text: '先读文件', status: { type: 'complete' } },
        toolCall({})
      ])
    ]

    expect(findRunPhase(messages, true)).toEqual({ kind: 'tool', label: '正在读取文件' })
  })

  it('lets a pending approval win over the running state', function () {
    const messages = [toMessage('assistant', [toolCall({ approval: { id: 'approval-1' } })])]

    expect(findRunPhase(messages, false)).toEqual({ kind: 'approval', label: '等待审批' })
  })

  it('does not report an undecided approval once it was resolved', function () {
    const messages = [
      toMessage('assistant', [toolCall({ approval: { id: 'approval-1', approved: true } })])
    ]

    expect(findRunPhase(messages, false)).toEqual({ kind: 'idle', label: '就绪' })
  })

  it('falls back to idle rather than the previous turn when the last parts are done', function () {
    const messages = [
      toMessage('assistant', [{ type: 'text', text: '上一轮', status: { type: 'running' } }]),
      toMessage('assistant', [toolCall({ result: 'ok' })])
    ]

    expect(findRunPhase(messages, false)).toEqual({ kind: 'idle', label: '就绪' })
  })
})

describe('summarizeToolCalls', function () {
  it('counts every call and reports failures with the shared failure rule', function () {
    const messages = [
      toMessage('assistant', [
        toolCall({ toolName: 'read' }),
        toolCall({ toolName: 'read', isError: true }),
        toolCall({ toolName: 'edit', status: { type: 'incomplete' } }),
        toolCall({ toolName: 'shell', status: { type: 'requires-action' } })
      ])
    ]

    expect(summarizeToolCalls(messages)).toEqual({
      total: 4,
      failed: 2,
      items: [
        { name: 'read', label: '读取文件', count: 2 },
        { name: 'edit', label: '修改文件', count: 1 },
        { name: 'shell', label: '执行命令', count: 1 }
      ]
    })
  })

  it('keeps an unknown tool name readable', function () {
    const messages = [toMessage('assistant', [toolCall({ toolName: 'brand-new' })])]

    expect(summarizeToolCalls(messages).items).toEqual([
      { name: 'brand-new', label: 'brand-new', count: 1 }
    ])
  })

  it('is empty for a conversation without tool calls', function () {
    expect(summarizeToolCalls([toMessage('user', [{ type: 'text', text: '你好' }])])).toEqual({
      total: 0,
      failed: 0,
      items: []
    })
  })
})

describe('findLastActivityAt', function () {
  it('reads the createdAt of the last message', function () {
    const at = new Date(1_700_000_000_000)
    const messages = [toMessage('user', [], new Date(0)), toMessage('assistant', [], at)]

    expect(findLastActivityAt(messages)).toEqual(at)
  })

  it('has nothing to report for an empty conversation', function () {
    expect(findLastActivityAt([])).toBeNull()
  })
})
