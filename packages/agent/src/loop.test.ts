import { describe, expect, it } from 'vitest'

import type { SessionUpdate } from './events'
import { runAgentLoop } from './loop'
import type { ModelDelta, ModelStream } from './model'
import type { Message } from './message'
import type { Provider } from './provider'
import type { Tool, ToolResult } from './tool'

/** 每步一次 `stream()` 调用；`steps[i]` 是第 i 步的增量 */
function mockStream(steps: ModelDelta[][]): ModelStream {
  let index = 0
  return {
    async *stream() {
      const deltas = steps[index] ?? []
      index += 1
      for (const delta of deltas) yield delta
    }
  }
}

function echoTool(isWrite = false): Tool {
  return {
    name: 'echo',
    description: '回显输入',
    parameters: { type: 'object', properties: { value: { type: 'string' } } },
    isWrite,
    execute: async function (input): Promise<ToolResult> {
      return { content: `echo:${JSON.stringify(input)}` }
    }
  }
}

function provider(): Provider {
  return {
    id: 'p1',
    kind: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o',
    models: [],
    enabled: true
  }
}

const userMessage: Message = {
  id: 'm1',
  role: 'user',
  parts: [{ type: 'text', text: 'hello' }]
}

async function collect(iter: AsyncIterable<SessionUpdate>): Promise<SessionUpdate[]> {
  const events: SessionUpdate[] = []
  for await (const event of iter) events.push(event)
  return events
}

describe('runAgentLoop', function () {
  it('纯文本：产出 text + finish', async function () {
    const events = await collect(
      runAgentLoop(
        {
          provider: provider(),
          model: 'gpt-4o',
          tools: {},
          messages: [userMessage]
        },
        {
          streamModel: mockStream([
            [
              { kind: 'text', text: 'hi' },
              { kind: 'finish', finishReason: 'stop', usage: { totalTokens: 5 } }
            ]
          ])
        }
      )
    )

    expect(events).toEqual([
      { kind: 'text', blockID: 'text-0', text: 'hi' },
      { kind: 'finish', finishReason: 'stop', usage: { totalTokens: 5 } }
    ])
  })

  it('工具调用：tool-call → tool-result → 下一轮 text → finish', async function () {
    const events = await collect(
      runAgentLoop(
        {
          provider: provider(),
          model: 'gpt-4o',
          permission: 'auto',
          tools: { echo: echoTool() },
          messages: [userMessage]
        },
        {
          streamModel: mockStream([
            [
              { kind: 'tool-call', toolCallId: 'c1', toolName: 'echo', input: { value: 'x' } },
              { kind: 'finish', finishReason: 'tool_calls' }
            ],
            [
              { kind: 'text', text: 'done' },
              { kind: 'finish', finishReason: 'stop' }
            ]
          ])
        }
      )
    )

    expect(events[0]).toEqual({
      kind: 'tool-call',
      toolCallId: 'c1',
      toolName: 'echo',
      input: { value: 'x' }
    })
    expect(events[1]).toEqual({
      kind: 'tool-result',
      toolCallId: 'c1',
      toolName: 'echo',
      output: 'echo:{"value":"x"}'
    })
    expect(events[2]).toEqual({ kind: 'text', blockID: 'text-1', text: 'done' })
    expect(events[3]).toEqual({ kind: 'finish', finishReason: 'stop', usage: {} })
  })

  it('readonly 拒绝写类工具', async function () {
    const events = await collect(
      runAgentLoop(
        {
          provider: provider(),
          model: 'gpt-4o',
          permission: 'readonly',
          tools: { echo: echoTool(true) },
          messages: [userMessage]
        },
        {
          streamModel: mockStream([
            [
              { kind: 'tool-call', toolCallId: 'c1', toolName: 'echo', input: { value: 'x' } },
              { kind: 'finish', finishReason: 'tool_calls' }
            ],
            [
              { kind: 'text', text: 'refused' },
              { kind: 'finish', finishReason: 'stop' }
            ]
          ])
        }
      )
    )

    expect(events[1]).toMatchObject({
      kind: 'tool-result',
      toolCallId: 'c1',
      isError: true
    })
  })
})
