import { afterEach, describe, expect, it, vi } from 'vitest'

import { createGatewayModelPort } from './gateway-model.ts'

const CHAT_URL = 'http://127.0.0.1:3000/api/v1/gateway/chat/completions'

vi.mock('@/features/chat/transport.ts', function () {
  return {
    findGatewayChatEndpoint: vi.fn(function () {
      return CHAT_URL
    })
  }
})

vi.mock('@/utils/auth.ts', function () {
  return {
    findAuthToken: vi.fn(function () {
      return 'tok'
    })
  }
})

import { findGatewayChatEndpoint } from '@/features/chat/transport.ts'
import { findAuthToken } from '@/utils/auth.ts'

afterEach(function () {
  vi.unstubAllGlobals()
  vi.mocked(findGatewayChatEndpoint).mockReturnValue(CHAT_URL)
  vi.mocked(findAuthToken).mockReturnValue('tok')
})

describe('createGatewayModelPort', function () {
  it('未选模型时 findTarget 为 null', async function () {
    const port = createGatewayModelPort(function () {
      return { model: '  ' }
    })
    expect(await port.findTarget()).toBeNull()
  })

  it('选了模型时 providerID 固定为 gateway', async function () {
    const port = createGatewayModelPort(function () {
      return { model: 'gpt-4o' }
    })
    expect(await port.findTarget()).toEqual({ providerID: 'gateway', model: 'gpt-4o' })
  })

  it('SSE 文本增量聚合成流事件并以 finish 收束', async function () {
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"你"}}]}\n\n')
        )
        controller.enqueue(
          encoder.encode('data: {"choices":[{"delta":{"content":"好"},"finish_reason":"stop"}]}\n\n')
        )
        controller.enqueue(
          encoder.encode(
            'data: {"choices":[],"usage":{"prompt_tokens":1,"completion_tokens":2,"total_tokens":3}}\n\n'
          )
        )
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      }
    })

    vi.stubGlobal(
      'fetch',
      vi.fn(function () {
        return Promise.resolve(
          new Response(stream, {
            status: 200,
            headers: { 'content-type': 'text/event-stream' }
          })
        )
      })
    )

    const port = createGatewayModelPort(function () {
      return { model: 'gpt-4o' }
    })
    const events = []
    for await (const event of port.run(
      {
        providerID: 'gateway',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }]
      },
      new AbortController().signal
    )) {
      events.push(event)
    }

    expect(events).toEqual([
      { kind: 'text', blockID: 'gateway-text', text: '你' },
      { kind: 'text', blockID: 'gateway-text', text: '好' },
      {
        kind: 'finish',
        finishReason: 'stop',
        usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 }
      }
    ])

    expect(vi.mocked(fetch)).toHaveBeenCalledWith(
      CHAT_URL,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer tok' })
      })
    )
  })

  it('JSON 业务错误转为 error 事件', async function () {
    vi.stubGlobal(
      'fetch',
      vi.fn(function () {
        return Promise.resolve(
          new Response(JSON.stringify({ code: 400006, success: false, msg: '配额已用尽' }), {
            status: 200,
            headers: { 'content-type': 'application/json' }
          })
        )
      })
    )

    const port = createGatewayModelPort(function () {
      return { model: 'gpt-4o' }
    })
    const events = []
    for await (const event of port.run(
      {
        providerID: 'gateway',
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'hi' }]
      },
      new AbortController().signal
    )) {
      events.push(event)
    }

    expect(events).toEqual([{ kind: 'error', message: '配额已用尽' }])
  })
})
