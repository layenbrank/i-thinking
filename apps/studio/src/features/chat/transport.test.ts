import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  CHAT_TRANSPORT_KINDS,
  findChatEndpoint,
  parseChatTransport,
  resolveChatTransport
} from './transport'

// findAuthToken 依赖 localStorage（studio 单测跑在 node 环境），这里直接桩掉
const auth = vi.hoisted(function () {
  return { token: null as string | null }
})

vi.mock('@/utils/auth.ts', function () {
  return {
    findAuthToken: function () {
      return auth.token
    }
  }
})

const ENDPOINT = 'http://127.0.0.1:3003/api/v1'

afterEach(function () {
  auth.token = null
  vi.unstubAllEnvs()
})

describe('findChatEndpoint', function () {
  it('未配置服务地址时返回 null', function () {
    vi.stubEnv('VITE_THINKING', '')
    expect(findChatEndpoint()).toBeNull()
  })

  it('拼接 chat 路由并去掉尾部斜杠', function () {
    vi.stubEnv('VITE_THINKING', `${ENDPOINT}/`)
    expect(findChatEndpoint()).toBe(`${ENDPOINT}/chat`)
  })
})

describe('parseChatTransport', function () {
  it('识别合法通路', function () {
    const allParsed = CHAT_TRANSPORT_KINDS.every(function (kind) {
      return parseChatTransport(kind) === kind
    })

    expect(allParsed).toBe(true)
  })

  it('脏数据回落到默认通路', function () {
    expect(parseChatTransport('cloud')).toBe('offline')
    expect(parseChatTransport(undefined)).toBe('offline')
  })
})

describe('resolveChatTransport', function () {
  it('在线通路满足条件时生效', function () {
    vi.stubEnv('VITE_THINKING', ENDPOINT)
    auth.token = 'token-1'

    expect(resolveChatTransport('online')).toBe('online')
  })

  it('缺服务地址或未登录时回落到离线', function () {
    vi.stubEnv('VITE_THINKING', ENDPOINT)
    expect(resolveChatTransport('online')).toBe('offline')

    vi.stubEnv('VITE_THINKING', '')
    auth.token = 'token-1'
    expect(resolveChatTransport('online')).toBe('offline')
  })
})
