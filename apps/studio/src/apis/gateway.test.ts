import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CREATE_GATEWAY_PROVIDER,
  DELETE_GATEWAY_PROVIDER,
  GET_GATEWAY_ADMIN_MODELS,
  GET_GATEWAY_AUDIT,
  GET_GATEWAY_PLANS,
  GET_GATEWAY_QUOTA_ME,
  GET_GATEWAY_USAGE,
  UPDATE_GATEWAY_MODEL,
  UPDATE_GATEWAY_PROVIDER
} from '@/apis/gateway.ts'

const httpMock = vi.hoisted(function () {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
})

vi.mock('@/utils/http.ts', function () {
  return { http: httpMock }
})

function envelope<T>(data: T) {
  return { code: 200000, success: true, msg: 'ok', data, timestamp: 0 }
}

beforeEach(function () {
  vi.clearAllMocks()
})

describe('gateway management client', function () {
  it('hits the admin routes and unwraps the envelope', async function () {
    const provider = { id: 'p1', name: '线上 OpenAI' }
    httpMock.get.mockResolvedValue(envelope([provider]))
    httpMock.post.mockResolvedValue(envelope(provider))
    httpMock.put.mockResolvedValue(envelope(provider))
    httpMock.delete.mockResolvedValue(envelope(null))

    await expect(GET_GATEWAY_ADMIN_MODELS()).resolves.toEqual([{ id: 'p1', name: '线上 OpenAI' }])
    expect(httpMock.get).toHaveBeenCalledWith('/gateway/admin/models', { signal: undefined })

    await CREATE_GATEWAY_PROVIDER({ kind: 'openai', name: '线上 OpenAI', baseUrl: 'https://x/v1' })
    expect(httpMock.post).toHaveBeenCalledWith('/gateway/providers', {
      kind: 'openai',
      name: '线上 OpenAI',
      baseUrl: 'https://x/v1'
    })

    await UPDATE_GATEWAY_PROVIDER('p1', { status: 'DISABLED' })
    expect(httpMock.put).toHaveBeenCalledWith('/gateway/providers/p1', { status: 'DISABLED' })

    await UPDATE_GATEWAY_MODEL('m1', { label: 'GPT-4o mini', enabled: false })
    expect(httpMock.put).toHaveBeenCalledWith('/gateway/admin/models/m1', {
      label: 'GPT-4o mini',
      enabled: false
    })

    await expect(DELETE_GATEWAY_PROVIDER('p1')).resolves.toBeNull()
    expect(httpMock.delete).toHaveBeenCalledWith('/gateway/providers/p1')
  })

  it('passes list filters through as query params', async function () {
    const page = { items: [], count: 0, page: 1, size: 20, total: 0, next: false, prev: false }
    httpMock.get.mockResolvedValue(envelope(page))

    await GET_GATEWAY_USAGE({ page: 2, size: 20, modelID: 'm1', from: 1700000000000 })
    expect(httpMock.get).toHaveBeenCalledWith('/gateway/usage', {
      query: { page: 2, size: 20, modelID: 'm1', from: 1700000000000 },
      signal: undefined
    })

    await GET_GATEWAY_AUDIT()
    expect(httpMock.get).toHaveBeenLastCalledWith('/gateway/audit', {
      query: {},
      signal: undefined
    })
  })

  it('reads my quota without an admin role, and passes the model through', async function () {
    const quota = {
      scope: 'TENANT',
      scopeID: 't1',
      tenantID: 't1',
      tenantType: 'PERSONAL',
      source: 'FREE',
      limit: 1000,
      used: 250,
      remaining: 750,
      exhausted: false,
      resetsAt: 1_700_000_000_000
    }
    httpMock.get.mockResolvedValue(envelope(quota))

    await expect(GET_GATEWAY_QUOTA_ME()).resolves.toEqual(quota)
    expect(httpMock.get).toHaveBeenLastCalledWith('/gateway/quota/me', {
      query: {},
      signal: undefined
    })

    await GET_GATEWAY_QUOTA_ME({ model: 'gpt-4o-mini' })
    expect(httpMock.get).toHaveBeenLastCalledWith('/gateway/quota/me', {
      query: { model: 'gpt-4o-mini' },
      signal: undefined
    })
  })

  it('reads the plan catalogue with the free baseline', async function () {
    const plans = {
      plans: [{ plan: 'pro', dailyTokenQuota: 1_000_000 }],
      freeDailyTokenQuota: 100_000
    }
    httpMock.get.mockResolvedValue(envelope(plans))

    await expect(GET_GATEWAY_PLANS()).resolves.toEqual(plans)
    expect(httpMock.get).toHaveBeenLastCalledWith('/gateway/plans', { signal: undefined })
  })

  it('surfaces the business code instead of returning empty data', async function () {
    // 管理面失败一律 HTTP 200 + 业务码，客户端必须按 code 判成败
    httpMock.get.mockResolvedValue({ code: 300006, success: false, msg: '权限不足' })

    await expect(GET_GATEWAY_ADMIN_MODELS()).rejects.toMatchObject({
      code: 300006,
      message: '权限不足'
    })
  })
})
