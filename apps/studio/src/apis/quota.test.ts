import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CREATE_TENANT_SUBSCRIPTION,
  DELETE_TENANT_SUBSCRIPTION,
  GET_MY_TENANTS,
  GET_TENANT_SUBSCRIPTIONS
} from '@/apis/quota.ts'

/**
 * 这里只覆盖租户与订阅；「我此刻的配额」在网关侧（`GET /gateway/quota/me`，见
 * `apis/gateway.test.ts`）—— 客户端不再翻页汇总用量明细，那条路径已删除。
 */

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

describe('tenant client', function () {
  it('reads tenants and subscriptions from the tenant routes', async function () {
    httpMock.get.mockResolvedValue(envelope([]))

    await GET_MY_TENANTS()
    expect(httpMock.get).toHaveBeenCalledWith('/tenants', { signal: undefined })

    await GET_TENANT_SUBSCRIPTIONS('t1')
    expect(httpMock.get).toHaveBeenCalledWith('/tenants/t1/subscriptions', { signal: undefined })
  })

  it('subscribes and cancels with the plan payload', async function () {
    httpMock.post.mockResolvedValue(envelope({ id: 's1', plan: 'pro' }))
    httpMock.delete.mockResolvedValue(envelope(null))

    await expect(CREATE_TENANT_SUBSCRIPTION('t1', { plan: 'pro' })).resolves.toEqual({
      id: 's1',
      plan: 'pro'
    })
    expect(httpMock.post).toHaveBeenCalledWith('/tenants/t1/subscriptions', { plan: 'pro' })

    await CREATE_TENANT_SUBSCRIPTION('t1', { plan: 'pro', expiresAt: 1_700_000_000_000 })
    expect(httpMock.post).toHaveBeenCalledWith('/tenants/t1/subscriptions', {
      plan: 'pro',
      expiresAt: 1_700_000_000_000
    })

    await DELETE_TENANT_SUBSCRIPTION('t1', 's1')
    expect(httpMock.delete).toHaveBeenCalledWith('/tenants/t1/subscriptions/s1')
  })

  it('rejects a non-success envelope', async function () {
    httpMock.get.mockResolvedValue({
      code: 300006,
      success: false,
      msg: '权限不足',
      data: null,
      timestamp: 0
    })

    await expect(GET_MY_TENANTS()).rejects.toThrow('权限不足')
  })
})
