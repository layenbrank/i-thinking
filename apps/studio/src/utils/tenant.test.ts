import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  cacheActiveTenant,
  clearActiveTenantCache,
  findActiveTenantID,
  isActiveTenantFresh
} from '@/utils/tenant.ts'

/**
 * 值缓存本身：`http.ts` 要同步读它，所以这里不能有 Promise。
 * 关键约定是「缓存一律带登录令牌指纹」—— 换账号、退登后必须立刻失效。
 */

const auth = vi.hoisted(function () {
  return { findAuthToken: vi.fn() }
})

vi.mock('./auth.ts', function () {
  return { findAuthToken: auth.findAuthToken }
})

beforeEach(function () {
  vi.clearAllMocks()
  clearActiveTenantCache()
  auth.findAuthToken.mockReturnValue('token-a')
})

describe('findActiveTenantID', function () {
  it('reports nothing before anything has been resolved', function () {
    expect(findActiveTenantID()).toBeNull()
  })

  it('serves the cached id while the token is unchanged', function () {
    cacheActiveTenant('t1', 'token-a')

    expect(findActiveTenantID()).toBe('t1')
  })

  it('keeps "this account has no personal tenant" as a resolved answer', function () {
    cacheActiveTenant(null, 'token-a')

    expect(findActiveTenantID()).toBeNull()
    expect(isActiveTenantFresh(1000)).toBe(true)
  })

  it('forgets the id as soon as another account signs in', function () {
    cacheActiveTenant('t1', 'token-a')

    auth.findAuthToken.mockReturnValue('token-b')

    expect(findActiveTenantID()).toBeNull()
    expect(isActiveTenantFresh(1000)).toBe(false)
  })

  it('forgets the id after a logout', function () {
    cacheActiveTenant('t1', 'token-a')

    auth.findAuthToken.mockReturnValue(null)

    expect(findActiveTenantID()).toBeNull()
  })

  it('fingerprints the token the resolution started with, not the one current at write time', function () {
    // 解析是异步的：结果回来时账号可能已经换了。指纹只能记「发起时」的令牌，
    // 现读的话就会把上一个账号的租户盖上当前令牌的指纹，TTL 内一路算错配额。
    auth.findAuthToken.mockReturnValue('token-b')

    cacheActiveTenant('t1', 'token-a')

    expect(findActiveTenantID()).toBeNull()
    expect(isActiveTenantFresh(1000)).toBe(false)
  })
})

describe('isActiveTenantFresh', function () {
  it('is never fresh before a resolution', function () {
    expect(isActiveTenantFresh(1000)).toBe(false)
  })

  it('is fresh inside the ttl and stale from the ttl on', function () {
    vi.useFakeTimers()
    vi.setSystemTime(0)

    cacheActiveTenant('t1', 'token-a')
    vi.setSystemTime(999)
    expect(isActiveTenantFresh(1000)).toBe(true)

    vi.setSystemTime(1000)
    expect(isActiveTenantFresh(1000)).toBe(false)

    vi.useRealTimers()
  })
})

describe('clearActiveTenantCache', function () {
  it('drops both the id and the freshness mark', function () {
    cacheActiveTenant('t1', 'token-a')

    clearActiveTenantCache()

    expect(findActiveTenantID()).toBeNull()
    expect(isActiveTenantFresh(1000)).toBe(false)
  })
})
