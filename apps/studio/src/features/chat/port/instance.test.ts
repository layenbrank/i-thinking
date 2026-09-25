import { beforeEach, describe, expect, it, vi } from 'vitest'

import { PLATFORM_PROVIDER_ID } from '@/features/chat/platform.ts'
import { findHostOptions } from '@/features/chat/port/instance.ts'
import { writeAuthToken } from '@/utils/auth.ts'

/**
 * 宿主扩展里的平台令牌。
 *
 * `port/model.ts` 按运行目标记下的那份缓存只用来读模型能力，它是加速而不是判定：
 * 平台行有固定 id，认得出它就该把登录令牌带上。按缓存里的 kind 判的时候，
 * 缓存没命中（热更、新旧模块图并存）就会静默丢令牌 —— 用户明明登录着，却被告知「登录已过期」。
 */

vi.mock('@/features/quota/tenant.ts', function () {
  return {
    findActiveTenantID: function () {
      return 't1'
    }
  }
})

function createStorage(store: Map<string, string>): Storage {
  return {
    getItem: function (key: string) {
      return store.get(key) ?? null
    },
    setItem: function (key: string, value: string) {
      store.set(key, value)
    },
    removeItem: function (key: string) {
      store.delete(key)
    }
  } as unknown as Storage
}

const storage = new Map<string, string>()
const session = new Map<string, string>()

beforeEach(function () {
  storage.clear()
  session.clear()
  vi.stubGlobal('localStorage', createStorage(storage))
  vi.stubGlobal('sessionStorage', createStorage(session))
})

describe('findHostOptions', function () {
  it('carries the platform token even when the target was never resolved', function () {
    writeAuthToken('jwt', true)

    const host = findHostOptions(
      { providerID: PLATFORM_PROVIDER_ID, model: 'deepseek-flash' },
      's1'
    )

    expect(host.platformToken).toBe('jwt')
    expect(host.tenantID).toBe('t1')
    expect(host.sessionID).toBe('s1')
  })

  it('omits the credential when nobody is signed in, so the host says «未登录»', function () {
    const host = findHostOptions(
      { providerID: PLATFORM_PROVIDER_ID, model: 'deepseek-flash' },
      's1'
    )

    // 租户归属只判「是不是平台行」，与有没有令牌无关（未登录时平台行压根选不中：
    // `dropStalePlatformRow` 在读入口就把它滤了）
    expect(host).not.toHaveProperty('platformToken')
    expect(host.tenantID).toBe('t1')
  })

  it('refuses to start a run without a session id', function () {
    // 空会话 id 的运行是「有害的成功」：用量记到 null、历史写入撞外键。
    // 它还会被 MessagePort 的结构化克隆丢掉（`{sessionID: undefined}` → 主进程只能看到
    // null），事后无从追查 —— 所以必须在渲染进程就炸出来。
    expect(function () {
      findHostOptions({ providerID: PLATFORM_PROVIDER_ID, model: 'deepseek-flash' }, '')
    }).toThrow('[CHAT] 会话身份未就绪，已拒绝发起运行')
  })

  it('never hands the platform token to a BYOK provider', function () {
    writeAuthToken('jwt', true)

    const host = findHostOptions({ providerID: 'efcf6617-local', model: 'glm-4' }, 's1')

    expect(host).not.toHaveProperty('platformToken')
    expect(host).not.toHaveProperty('tenantID')
  })
})
