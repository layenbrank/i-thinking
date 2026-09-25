import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Tenant } from '@/apis/quota.ts'
import {
  CACHE_TTL_MS,
  clearActiveTenant,
  findActiveTenantID,
  findPersonalTenant,
  syncActiveTenant
} from '@/features/quota/tenant.ts'

const api = vi.hoisted(function () {
  return {
    getMyTenants: vi.fn(),
    findAuthToken: vi.fn()
  }
})

vi.mock('@/apis/quota.ts', function () {
  return {
    GET_MY_TENANTS: api.getMyTenants,
    PERSONAL_TENANT: 'PERSONAL'
  }
})

vi.mock('@/utils/auth.ts', function () {
  return { findAuthToken: api.findAuthToken }
})

function tenant(id: string, type: string): Tenant {
  return {
    id,
    name: id,
    slug: id,
    status: 'ACTIVE',
    type,
    createdAt: 0,
    updatedAt: 0
  }
}

beforeEach(function () {
  vi.clearAllMocks()
  clearActiveTenant()
  api.findAuthToken.mockReturnValue('token-a')
  vi.spyOn(console, 'warn').mockImplementation(function () {
    return undefined
  })
})

describe('findPersonalTenant', function () {
  it('picks the personal tenant out of the list', function () {
    const picked = findPersonalTenant([tenant('team', 'TEAM'), tenant('me', 'PERSONAL')])

    expect(picked?.id).toBe('me')
  })

  it('returns null when there is no personal tenant', function () {
    expect(findPersonalTenant([tenant('team', 'TEAM')])).toBeNull()
    expect(findPersonalTenant([])).toBeNull()
  })
})

describe('syncActiveTenant', function () {
  it('resolves once and serves the cached id to the synchronous reader', async function () {
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])

    await expect(syncActiveTenant()).resolves.toBe('me')
    expect(findActiveTenantID()).toBe('me')

    await expect(syncActiveTenant()).resolves.toBe('me')
    expect(api.getMyTenants).toHaveBeenCalledTimes(1)
  })

  it('shares one in-flight request between concurrent callers', async function () {
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])

    const [first, second] = await Promise.all([syncActiveTenant(), syncActiveTenant()])

    expect(first).toBe('me')
    expect(second).toBe('me')
    expect(api.getMyTenants).toHaveBeenCalledTimes(1)
  })

  it('caches null when the account has no personal tenant', async function () {
    api.getMyTenants.mockResolvedValue([tenant('team', 'TEAM')])

    await expect(syncActiveTenant()).resolves.toBeNull()
    expect(findActiveTenantID()).toBeNull()
  })

  it('drops the cache as soon as the auth token changes', async function () {
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])
    await syncActiveTenant()

    api.findAuthToken.mockReturnValue('token-b')
    expect(findActiveTenantID()).toBeNull()

    api.getMyTenants.mockResolvedValue([tenant('other', 'PERSONAL')])
    await expect(syncActiveTenant()).resolves.toBe('other')
    expect(findActiveTenantID()).toBe('other')
  })

  it('discards a resolution that lands after the account changed mid-flight', async function () {
    let resolveTenants: (tenants: Tenant[]) => void = function () {}
    api.getMyTenants.mockReturnValue(
      new Promise<Tenant[]>(function (resolve) {
        resolveTenants = resolve
      })
    )

    const inFlight = syncActiveTenant()
    // 请求还挂着的时候换账号/退登：这份结果属于上一个账号，不能记在当前令牌名下
    api.findAuthToken.mockReturnValue('token-b')
    resolveTenants([tenant('me', 'PERSONAL')])

    await expect(inFlight).resolves.toBeNull()
    expect(findActiveTenantID()).toBeNull()

    // 下一个账号照常重新解析，不会被上一份结果顶掉
    api.getMyTenants.mockResolvedValue([tenant('other', 'PERSONAL')])
    await expect(syncActiveTenant()).resolves.toBe('other')
  })

  it('re-resolves after the ttl expires', async function () {
    vi.useFakeTimers()
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])
    await syncActiveTenant()

    vi.advanceTimersByTime(CACHE_TTL_MS)
    await syncActiveTenant()

    expect(api.getMyTenants).toHaveBeenCalledTimes(2)
    vi.useRealTimers()
  })

  it('re-resolves when forced even inside the ttl', async function () {
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])
    await syncActiveTenant()
    await syncActiveTenant({ force: true })

    expect(api.getMyTenants).toHaveBeenCalledTimes(2)
  })

  it('clears the cache and stays quiet when the lookup fails', async function () {
    api.getMyTenants.mockResolvedValueOnce([tenant('me', 'PERSONAL')])
    await syncActiveTenant()

    api.getMyTenants.mockRejectedValueOnce(new Error('offline'))

    await expect(syncActiveTenant({ force: true })).resolves.toBeNull()
    expect(findActiveTenantID()).toBeNull()
    expect(console.warn).toHaveBeenCalled()
  })

  it('retries after a failure instead of serving a stale tenant', async function () {
    api.getMyTenants.mockRejectedValueOnce(new Error('offline'))
    await expect(syncActiveTenant()).resolves.toBeNull()

    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])
    await expect(syncActiveTenant()).resolves.toBe('me')
  })
})

describe('clearActiveTenant', function () {
  it('forgets the resolved tenant', async function () {
    api.getMyTenants.mockResolvedValue([tenant('me', 'PERSONAL')])
    await syncActiveTenant()

    clearActiveTenant()

    expect(findActiveTenantID()).toBeNull()
  })
})
