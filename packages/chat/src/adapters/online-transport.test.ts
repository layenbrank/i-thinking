import { AssistantChatTransport } from '@assistant-ui/ai-sdk'
import { describe, expect, test } from 'vitest'

import { buildAuthHeaders, buildModelBody, createOnlineTransport } from './online-transport'

const URL = 'http://127.0.0.1:3003/api/v1/chat'

describe('buildAuthHeaders', function () {
  test('有 token 时带 Bearer', function () {
    const headers = buildAuthHeaders(function () {
      return 'token-1'
    })

    expect(headers).toEqual({ Authorization: 'Bearer token-1' })
  })

  test('无 token 时为空对象', function () {
    const headers = buildAuthHeaders(function () {
      return null
    })

    expect(headers).toEqual({})
  })
})

describe('buildModelBody', function () {
  test('选了模型时带上 model', function () {
    const body = buildModelBody(function () {
      return ' qwen3:8b '
    })

    expect(body).toEqual({ model: 'qwen3:8b' })
  })

  test('未选模型时用服务端默认（空 body）', function () {
    const body = buildModelBody(function () {
      return '   '
    })

    expect(body).toEqual({})
  })
})

describe('createOnlineTransport', function () {
  test('产出可用的 AI SDK 传输实例', function () {
    const transport = createOnlineTransport({ url: URL })

    expect(transport).toBeInstanceOf(AssistantChatTransport)
    expect(typeof transport.sendMessages).toBe('function')
  })

  test('构造时不读取 token / 模型（延迟到请求时）', function () {
    let tokenCalls = 0
    let modelCalls = 0

    createOnlineTransport({
      url: URL,
      findToken: function () {
        tokenCalls += 1
        return 'token-1'
      },
      findModel: function () {
        modelCalls += 1
        return 'qwen3:8b'
      }
    })

    expect(tokenCalls).toBe(0)
    expect(modelCalls).toBe(0)
  })
})
