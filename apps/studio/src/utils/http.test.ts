import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { http } from '@/utils/http.ts'

/**
 * 请求拦截器的两条规矩：
 *   1. 网关路径（`/gateway/*`）带 `X-Tenant-ID` —— 不带的话服务端按账号归属兜底，
 *      团队共享的模型会整批看不见（「模型目录是空的」就是这么来的）；
 *   2. 登录令牌只发给自家接口，别的域名一律不带（网关那个头也不许外泄）。
 *
 * 这里直接抓住 `ofetch.create` 收到的 `onRequest` 调用它，比真起一个 server 更贴近
 * 「头是在哪一行加的」这件事。
 */

interface RequestContext {
  request: RequestInfo | URL
  options: { headers: Headers }
}

interface HttpConfig {
  onRequest: (context: RequestContext) => void
}

const ofetchMock = vi.hoisted(function () {
  const fetcher = vi.fn()
  const configs: HttpConfig[] = []
  const create = vi.fn(function (config: HttpConfig) {
    configs.push(config)
    return fetcher
  })

  return { configs, create, fetcher }
})

const auth = vi.hoisted(function () {
  return { findAuthToken: vi.fn() }
})

const tenant = vi.hoisted(function () {
  return { findActiveTenantID: vi.fn() }
})

vi.mock('ofetch', async function (importOriginal) {
  const actual = (await importOriginal()) as Record<string, unknown>
  return { ...actual, ofetch: ofetchMock }
})

vi.mock('./auth.ts', function () {
  return { findAuthToken: auth.findAuthToken }
})

vi.mock('./tenant.ts', function () {
  return { findActiveTenantID: tenant.findActiveTenantID }
})

const THINKING_BASE = 'https://api.example.com/api/v1'

function send(request: RequestInfo | URL): Headers {
  const headers = new Headers()
  ofetchMock.configs[0].onRequest({ request, options: { headers } })
  return headers
}

beforeEach(function () {
  vi.clearAllMocks()
  vi.stubEnv('VITE_THINKING', THINKING_BASE)
  auth.findAuthToken.mockReturnValue('jwt-token')
  tenant.findActiveTenantID.mockReturnValue('t1')
})

afterEach(function () {
  vi.unstubAllEnvs()
})

describe('gateway tenant header', function () {
  it('tags gateway calls with the active tenant', function () {
    expect(send('/gateway/models').get('X-Tenant-ID')).toBe('t1')
    expect(send('/gateway/quota/me').get('X-Tenant-ID')).toBe('t1')
  })

  it('leaves tenant routes alone', function () {
    expect(send('/tenants').get('X-Tenant-ID')).toBeNull()
    expect(send('/tenants/t1/subscriptions').get('X-Tenant-ID')).toBeNull()
  })

  it('tags an absolute gateway url on our own api', function () {
    expect(send(`${THINKING_BASE}/gateway/quota/me`).get('X-Tenant-ID')).toBe('t1')
    expect(send(new URL(`${THINKING_BASE}/gateway/models`)).get('X-Tenant-ID')).toBe('t1')
  })

  it('never leaks the tenant to another host', function () {
    expect(send('https://evil.example.com/api/v1/gateway/models').get('X-Tenant-ID')).toBeNull()
  })

  it('sends nothing when no tenant has been resolved yet', function () {
    tenant.findActiveTenantID.mockReturnValue(null)

    expect(send('/gateway/models').get('X-Tenant-ID')).toBeNull()
  })

  it('does not even look up a tenant for non-gateway calls', function () {
    send('/tenants')

    expect(tenant.findActiveTenantID).not.toHaveBeenCalled()
  })
})

describe('auth token header', function () {
  it('keeps the bearer token on our own api', function () {
    expect(send('/gateway/models').get('Authorization')).toContain('jwt-token')
    expect(send('/tenants').get('Authorization')).toContain('jwt-token')
  })

  it('sends no token when signed out', function () {
    auth.findAuthToken.mockReturnValue(null)

    expect(send('/gateway/models').get('Authorization')).toBeNull()
  })

  it('sends no token to another host', function () {
    expect(send('https://evil.example.com/api/v1/tenants').get('Authorization')).toBeNull()
  })
})

describe('http client', function () {
  it('sends the method along with the caller options', function () {
    void http.get('/gateway/models', { query: { model: 'gpt' } })
    expect(ofetchMock.fetcher).toHaveBeenCalledWith('/gateway/models', {
      query: { model: 'gpt' },
      method: 'GET'
    })

    void http.post('/tenants/t1/subscriptions', { plan: 'pro' })
    expect(ofetchMock.fetcher).toHaveBeenLastCalledWith('/tenants/t1/subscriptions', {
      method: 'POST',
      body: { plan: 'pro' }
    })

    void http.delete('/tenants/t1/subscriptions/s1')
    expect(ofetchMock.fetcher).toHaveBeenLastCalledWith('/tenants/t1/subscriptions/s1', {
      method: 'DELETE'
    })
  })
})
