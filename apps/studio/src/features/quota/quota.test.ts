import { describe, expect, it } from 'vitest'

import type { GatewaySelfQuota } from '@/apis/gateway.ts'
import {
  findQuotaScopeLabel,
  findQuotaSourceLabel,
  formatTokens,
  toQuotaView
} from '@/features/quota/quota.ts'

/**
 * 上限、已用、是否触顶都由服务端算好，这里只验证「原样搬运 + 进度条换算」，
 * 不再有客户端汇总（旧版的 `findEffectiveLimit` / `isQuotaExhausted` 已删）。
 */

function quota(partial: Partial<GatewaySelfQuota> = {}): GatewaySelfQuota {
  return {
    scope: 'TENANT',
    scopeID: 't1',
    tenantID: 't1',
    tenantType: 'PERSONAL',
    source: 'FREE',
    limit: 1000,
    used: 250,
    remaining: 750,
    exhausted: false,
    resetsAt: Date.UTC(2024, 4, 10),
    ...partial
  }
}

describe('findQuotaSourceLabel', function () {
  it('labels the four known sources and passes unknown ones through', function () {
    expect(findQuotaSourceLabel('MODEL')).toBe('模型覆盖')
    expect(findQuotaSourceLabel('PLAN')).toBe('订阅档位')
    expect(findQuotaSourceLabel('FREE')).toBe('免费档')
    expect(findQuotaSourceLabel('GLOBAL')).toBe('全局配额')
    expect(findQuotaSourceLabel('SOMETHING')).toBe('SOMETHING')
  })
})

describe('findQuotaScopeLabel', function () {
  it('labels the two billing scopes and passes unknown ones through', function () {
    expect(findQuotaScopeLabel('TENANT')).toBe('租户')
    expect(findQuotaScopeLabel('USER')).toBe('账号')
    expect(findQuotaScopeLabel('SOMETHING')).toBe('SOMETHING')
  })
})

describe('toQuotaView', function () {
  it('returns null before the snapshot arrives', function () {
    expect(toQuotaView(null)).toBeNull()
    expect(toQuotaView(undefined)).toBeNull()
  })

  it('passes the server numbers straight through', function () {
    const view = toQuotaView(quota({ source: 'PLAN', plan: 'pro' }))

    expect(view).toEqual({
      limit: 1000,
      used: 250,
      remaining: 750,
      percent: 25,
      exhausted: false,
      sourceLabel: '订阅档位',
      scopeLabel: '租户',
      plan: 'pro',
      resetsAt: Date.UTC(2024, 4, 10),
      fromModel: false
    })
  })

  it('believes the server about exhaustion instead of recomputing it', function () {
    const view = toQuotaView(quota({ used: 10, remaining: 990, exhausted: true }))

    expect(view?.exhausted).toBe(true)
    expect(view?.percent).toBe(1)
  })

  it('caps the bar at 100% when the window is overspent', function () {
    const view = toQuotaView(quota({ used: 1500, remaining: 0, exhausted: true }))

    expect(view?.percent).toBe(100)
    expect(view?.remaining).toBe(0)
  })

  it('treats a zero limit as a full bar', function () {
    const view = toQuotaView(quota({ limit: 0, used: 0, remaining: 0, exhausted: true }))

    expect(view?.percent).toBe(100)
  })

  it('flags a model level override', function () {
    const view = toQuotaView(quota({ source: 'MODEL' }))

    expect(view?.fromModel).toBe(true)
    expect(view?.sourceLabel).toBe('模型覆盖')
    expect(view?.plan).toBeNull()
  })

  it('reports the account scope for a signed-in user without a tenant', function () {
    const view = toQuotaView(quota({ scope: 'USER', scopeID: 'u1', tenantID: undefined }))

    expect(view?.scopeLabel).toBe('账号')
  })
})

describe('formatTokens', function () {
  it('keeps small numbers verbatim and scales large ones', function () {
    expect(formatTokens(0)).toBe('0')
    expect(formatTokens(9999)).toBe('9999')
    expect(formatTokens(12_500)).toBe('1.3 万')
    expect(formatTokens(2_000_000)).toBe('200.0 万')
    expect(formatTokens(150_000_000)).toBe('1.5 亿')
  })

  it('handles negative numbers by magnitude', function () {
    expect(formatTokens(-12_500)).toBe('-1.3 万')
  })
})
