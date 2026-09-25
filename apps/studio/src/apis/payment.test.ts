import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CLOSE_PAYMENT_ORDER,
  CREATE_PAYMENT_ORDER,
  GET_PAYMENT_CATALOG,
  GET_PAYMENT_ORDER,
  GET_TENANT_ORDERS,
  SYNC_PAYMENT_ORDER
} from '@/apis/payment.ts'

/**
 * 客户端只能做四件事：读目录、下单、查单、关单。这里锁住路径与请求体 —— 下单**只提交** `plan` +
 * `channel`，金额永远由服务端按 `pay.plans` 定价（客户端提交价格是被刻意禁止的）。
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

describe('payment client', function () {
  it('reads the catalog and the order history from the tenant routes', async function () {
    httpMock.get.mockResolvedValue(envelope({ currency: 'CNY', orderTtlSecs: 300, plans: [] }))

    await GET_PAYMENT_CATALOG('t1')
    expect(httpMock.get).toHaveBeenCalledWith('/tenants/t1/pay/catalog', { signal: undefined })

    await GET_TENANT_ORDERS('t1')
    expect(httpMock.get).toHaveBeenCalledWith('/tenants/t1/orders', { signal: undefined })

    await GET_PAYMENT_ORDER('t1', 'P1', AbortSignal.abort())
    expect(httpMock.get).toHaveBeenCalledWith('/tenants/t1/orders/P1', {
      signal: expect.any(AbortSignal)
    })
  })

  it('creates an order with the plan and channel only', async function () {
    httpMock.post.mockResolvedValue(envelope({ orderNo: 'P1', status: 'PENDING' }))

    await expect(CREATE_PAYMENT_ORDER('t1', { plan: 'pro', channel: 'WECHAT' })).resolves.toEqual({
      orderNo: 'P1',
      status: 'PENDING'
    })
    expect(httpMock.post).toHaveBeenCalledWith('/tenants/t1/orders', {
      plan: 'pro',
      channel: 'WECHAT'
    })
  })

  it('syncs and closes through POST on the order', async function () {
    httpMock.post.mockResolvedValue(envelope({ orderNo: 'P1', status: 'PAID' }))

    await SYNC_PAYMENT_ORDER('t1', 'P1')
    expect(httpMock.post).toHaveBeenCalledWith('/tenants/t1/orders/P1/sync')

    await CLOSE_PAYMENT_ORDER('t1', 'P1')
    expect(httpMock.post).toHaveBeenCalledWith('/tenants/t1/orders/P1/close')
  })

  it('rejects a non-success envelope', async function () {
    httpMock.post.mockResolvedValue({
      code: 500408,
      success: false,
      msg: '该档位需通过支付开通',
      data: null,
      timestamp: 0
    })

    await expect(CREATE_PAYMENT_ORDER('t1', { plan: 'pro', channel: 'WECHAT' })).rejects.toThrow(
      '该档位需通过支付开通'
    )
  })
})
