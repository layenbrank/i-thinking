import { describe, expect, it } from 'vitest'

import {
  MAX_CONCURRENT_RUNS,
  MAX_CONTENT_CHARS,
  MAX_MESSAGES,
  MAX_PAYLOAD_CHARS,
  parseInbound,
  toPortEvent,
  type StreamPart
} from './assistant-protocol'

/** 构造流片段：真实片段来自 AI SDK，测试只关心本插件读取的字段 */
function part(value: unknown): StreamPart {
  return value as StreamPart
}

const RUN_ID = 'run-1'

function validStart() {
  return {
    kind: 'start',
    runID: RUN_ID,
    providerID: 'provider-1',
    model: 'qwen3:8b',
    messages: [{ role: 'user', content: '你好' }]
  }
}

describe('parseInbound', function () {
  it('接受合法的 start / abort', function () {
    expect(parseInbound(validStart())).toEqual(validStart())
    expect(parseInbound({ kind: 'abort', runID: RUN_ID })).toEqual({ kind: 'abort', runID: RUN_ID })
  })

  it('接受可选 system，且不接受未知角色', function () {
    const withSystem = { ...validStart(), system: '你是助手' }
    expect(parseInbound(withSystem)).toEqual(withSystem)

    const badRole = {
      ...validStart(),
      messages: [{ role: 'tool', content: 'x' }]
    }
    expect(parseInbound(badRole)).toBeNull()
  })

  it('拒绝未知 kind 与缺字段的消息', function () {
    expect(parseInbound({ kind: 'stop', runID: RUN_ID })).toBeNull()
    expect(parseInbound({ kind: 'start', runID: RUN_ID })).toBeNull()
    expect(parseInbound(null)).toBeNull()
    expect(parseInbound('start')).toBeNull()
  })

  it('接受带图片的用户消息，拒绝超长图片', function () {
    const withImage = {
      ...validStart(),
      messages: [
        {
          role: 'user',
          content: '看这张图',
          images: [{ mediaType: 'image/png', data: 'data:image/png;base64,a' }]
        }
      ]
    }
    expect(parseInbound(withImage)).toEqual(withImage)

    const tooBig = {
      ...validStart(),
      messages: [
        {
          role: 'user',
          content: '看这张图',
          images: [{ mediaType: 'image/png', data: 'x'.repeat(700_001) }]
        }
      ]
    }
    expect(parseInbound(tooBig)).toBeNull()
  })

  it('拒绝超量消息、超长正文', function () {
    const tooMany = {
      ...validStart(),
      messages: Array.from({ length: MAX_MESSAGES + 1 }, function () {
        return { role: 'user', content: 'x' }
      })
    }
    expect(parseInbound(tooMany)).toBeNull()

    const tooLong = {
      ...validStart(),
      messages: [{ role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS + 1) }]
    }
    expect(parseInbound(tooLong)).toBeNull()
  })

  it('拒绝超过 payload 上限的消息（含不可序列化对象）', function () {
    // 每条都在正文上限内，但总量超过 payload 上限
    const huge = {
      ...validStart(),
      messages: Array.from({ length: 20 }, function () {
        return { role: 'user', content: 'x'.repeat(MAX_CONTENT_CHARS) }
      })
    }
    expect(JSON.stringify(huge).length).toBeGreaterThan(MAX_PAYLOAD_CHARS)
    expect(parseInbound(huge)).toBeNull()

    expect(parseInbound({ ...validStart(), huge: 1n })).toBeNull()
  })

  it('并发上限是大于 1 的小常数', function () {
    expect(MAX_CONCURRENT_RUNS).toBeGreaterThan(1)
    expect(MAX_CONCURRENT_RUNS).toBeLessThanOrEqual(8)
  })
})

describe('toPortEvent', function () {
  it('文本与推理增量带 blockID', function () {
    expect(toPortEvent(part({ type: 'text-delta', id: 'b1', text: '你' }), RUN_ID)).toEqual({
      kind: 'text',
      runID: RUN_ID,
      blockID: 'b1',
      text: '你'
    })
    expect(toPortEvent(part({ type: 'reasoning-delta', id: 'b2', text: '想' }), RUN_ID)).toEqual({
      kind: 'reasoning',
      runID: RUN_ID,
      blockID: 'b2',
      text: '想'
    })
  })

  it('工具调用透传 id / name / input', function () {
    expect(
      toPortEvent(
        part({
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'weather',
          input: { city: '杭州' }
        }),
        RUN_ID
      )
    ).toEqual({
      kind: 'tool-call',
      runID: RUN_ID,
      toolCallId: 'call-1',
      toolName: 'weather',
      input: { city: '杭州' }
    })
  })

  it('finish 带上用量，缺失字段不出现', function () {
    expect(
      toPortEvent(
        part({
          type: 'finish',
          finishReason: 'stop',
          totalUsage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 }
        }),
        RUN_ID
      )
    ).toEqual({
      kind: 'finish',
      runID: RUN_ID,
      finishReason: 'stop',
      usage: { inputTokens: 3, outputTokens: 5, totalTokens: 8 }
    })

    expect(
      toPortEvent(
        part({ type: 'finish', finishReason: 'length', totalUsage: { outputTokens: 5 } }),
        RUN_ID
      )
    ).toEqual({ kind: 'finish', runID: RUN_ID, finishReason: 'length', usage: { outputTokens: 5 } })
  })

  it('abort 与 error 映射为可展示的信息', function () {
    expect(toPortEvent(part({ type: 'abort' }), RUN_ID)).toEqual({ kind: 'aborted', runID: RUN_ID })
    expect(toPortEvent(part({ type: 'error', error: new Error('连接被拒绝') }), RUN_ID)).toEqual({
      kind: 'error',
      runID: RUN_ID,
      message: '连接被拒绝'
    })
    expect(toPortEvent(part({ type: 'error', error: { code: 42 } }), RUN_ID)).toEqual({
      kind: 'error',
      runID: RUN_ID,
      message: 'Unknown error'
    })
  })

  it('404 类失败在消息里带上「检查 /v1」的提示', function () {
    const error = Object.assign(new Error('Not Found'), { statusCode: 404 })

    expect(toPortEvent(part({ type: 'error', error }), RUN_ID)).toEqual({
      kind: 'error',
      runID: RUN_ID,
      message:
        'Not Found（检查 provider 的「服务地址」有没有带 /v1（Ollama：http://127.0.0.1:11434/v1））'
    })
  })

  it('与协议无关的片段返回 null', function () {
    expect(toPortEvent(part({ type: 'start' }), RUN_ID)).toBeNull()
    expect(toPortEvent(part({ type: 'start-step' }), RUN_ID)).toBeNull()
    expect(toPortEvent(part({ type: 'text-start', id: 'b1' }), RUN_ID)).toBeNull()
    expect(toPortEvent(part({ type: 'raw', rawValue: {} }), RUN_ID)).toBeNull()
  })
})
