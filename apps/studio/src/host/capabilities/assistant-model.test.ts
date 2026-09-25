import { describe, expect, it } from 'vitest'

import { isGatewayProvider, resolveConnection } from './assistant-model'

const NO_CREDENTIALS = { apiKey: null, platformToken: null }

describe('isGatewayProvider', function () {
  it('只认网关 kind', function () {
    expect(isGatewayProvider({ kind: 'gateway', baseUrl: 'http://x/gateway' })).toBe(true)
    expect(isGatewayProvider({ kind: 'ollama', baseUrl: 'http://x/v1' })).toBe(false)
  })
})

describe('resolveConnection · 本机 BYOK', function () {
  it('有 Key 就带上', function () {
    expect(
      resolveConnection(
        { kind: 'openai', baseUrl: 'https://api.openai.com/v1' },
        {
          apiKey: 'sk-1',
          platformToken: null
        }
      )
    ).toEqual({ baseURL: 'https://api.openai.com/v1', apiKey: 'sk-1' })
  })

  it('没 Key 也能连（本机 Ollama / LM Studio）', function () {
    expect(
      resolveConnection({ kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1' }, NO_CREDENTIALS)
    ).toEqual({ baseURL: 'http://127.0.0.1:11434/v1' })
  })

  it('云端 provider 没 Key 直接不可用，并带上名字提示去配置', function () {
    const result = resolveConnection(
      { kind: 'deepseek', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1' },
      NO_CREDENTIALS
    )

    expect(typeof result).toBe('string')
    expect(result).toContain('DeepSeek')
    expect(result).toContain('API Key')
  })

  it('未知 kind 按需要 Key 处理（宁可挡住也不发注定失败的请求）', function () {
    const result = resolveConnection(
      { kind: 'some-cloud', baseUrl: 'https://api.example.com/v1' },
      NO_CREDENTIALS
    )

    expect(typeof result).toBe('string')
    expect(result).toContain('some-cloud')
  })

  it('本机 provider 不会误用平台令牌', function () {
    expect(
      resolveConnection(
        { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
        {
          apiKey: null,
          platformToken: 'jwt'
        }
      )
    ).toEqual({ baseURL: 'http://127.0.0.1:11434/v1' })
  })
})

describe('resolveConnection · 平台网关', function () {
  it('用登录令牌当 apiKey', function () {
    expect(
      resolveConnection(
        { kind: 'gateway', baseUrl: 'http://127.0.0.1:3000/api/v1/gateway' },
        {
          apiKey: 'sk-local-should-be-ignored',
          platformToken: 'jwt'
        }
      )
    ).toEqual({ baseURL: 'http://127.0.0.1:3000/api/v1/gateway', apiKey: 'jwt' })
  })

  it('没令牌给可读的错误文案', function () {
    const result = resolveConnection(
      { kind: 'gateway', baseUrl: 'http://127.0.0.1:3000/api/v1/gateway' },
      NO_CREDENTIALS
    )

    expect(typeof result).toBe('string')
    expect(result).toContain('登录')
  })

  it('有租户就带上 X-Tenant-ID（网关按它算配额）', function () {
    expect(
      resolveConnection(
        { kind: 'gateway', baseUrl: 'http://127.0.0.1:3000/api/v1/gateway' },
        {
          apiKey: null,
          platformToken: 'jwt',
          tenantID: 't-1'
        }
      )
    ).toEqual({
      baseURL: 'http://127.0.0.1:3000/api/v1/gateway',
      apiKey: 'jwt',
      headers: { 'X-Tenant-ID': 't-1' }
    })
  })

  it('没解析出租户就不带这个头（服务端按用户归属兜底）', function () {
    expect(
      resolveConnection(
        { kind: 'gateway', baseUrl: 'http://127.0.0.1:3000/api/v1/gateway' },
        {
          apiKey: null,
          platformToken: 'jwt',
          tenantID: null
        }
      )
    ).toEqual({ baseURL: 'http://127.0.0.1:3000/api/v1/gateway', apiKey: 'jwt' })
  })

  it('租户头不会漏给本机 provider', function () {
    expect(
      resolveConnection(
        { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434/v1' },
        {
          apiKey: null,
          platformToken: 'jwt',
          tenantID: 't-1'
        }
      )
    ).toEqual({ baseURL: 'http://127.0.0.1:11434/v1' })
  })
})

describe('resolveConnection · 缺 baseUrl', function () {
  it('返回文案而不是抛异常', function () {
    const result = resolveConnection({ kind: 'ollama', baseUrl: null }, NO_CREDENTIALS)

    expect(result).toContain('baseUrl')
  })
})
