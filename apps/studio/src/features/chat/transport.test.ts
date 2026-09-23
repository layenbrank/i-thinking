import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  DEFAULT_CHAT_TRANSPORT,
  findGatewayChatEndpoint,
  findGatewayModelsEndpoint,
  findThinkingBase,
  parseChatTransport,
  resolveChatTransport
} from './transport.ts'

const ENDPOINT = 'http://127.0.0.1:3000/api/v1'

vi.mock('@/utils/auth.ts', function () {
  return {
    findAuthToken: vi.fn(function () {
      return 'token'
    })
  }
})

import { findAuthToken } from '@/utils/auth.ts'

afterEach(function () {
  vi.unstubAllEnvs()
  vi.mocked(findAuthToken).mockReturnValue('token')
})

describe('findThinkingBase / gateway endpoints', function () {
  it('未配置时返回 null', function () {
    vi.stubEnv('VITE_THINKING', '')
    expect(findThinkingBase()).toBeNull()
    expect(findGatewayChatEndpoint()).toBeNull()
    expect(findGatewayModelsEndpoint()).toBeNull()
  })

  it('去掉尾斜杠并拼 gateway 路径', function () {
    vi.stubEnv('VITE_THINKING', `${ENDPOINT}/`)
    expect(findThinkingBase()).toBe(ENDPOINT)
    expect(findGatewayChatEndpoint()).toBe(`${ENDPOINT}/gateway/chat/completions`)
    expect(findGatewayModelsEndpoint()).toBe(`${ENDPOINT}/gateway/models`)
  })
})

describe('parseChatTransport / resolveChatTransport', function () {
  it('合法值原样返回，脏数据回落默认', function () {
    const allParsed = (['offline', 'online'] as const).every(function (kind) {
      return parseChatTransport(kind) === kind
    })
    expect(allParsed).toBe(true)
    expect(parseChatTransport('cloud')).toBe(DEFAULT_CHAT_TRANSPORT)
    expect(parseChatTransport(undefined)).toBe(DEFAULT_CHAT_TRANSPORT)
  })

  it('在线就绪时 resolve 保持 online', function () {
    vi.stubEnv('VITE_THINKING', ENDPOINT)
    vi.mocked(findAuthToken).mockReturnValue('token')
    expect(resolveChatTransport('online')).toBe('online')
  })

  it('未登录或无地址时 online 回落 offline', function () {
    vi.stubEnv('VITE_THINKING', ENDPOINT)
    vi.mocked(findAuthToken).mockReturnValue(null)
    expect(resolveChatTransport('online')).toBe('offline')

    vi.stubEnv('VITE_THINKING', '')
    vi.mocked(findAuthToken).mockReturnValue('token')
    expect(resolveChatTransport('online')).toBe('offline')
  })
})
