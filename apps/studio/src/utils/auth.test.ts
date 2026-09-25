import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  clearAuthToken,
  clearAuthTokenIfCurrent,
  findAuthToken,
  findAuthRole,
  isAdmin,
  isAuthTokenExpired,
  isSessionInvalid,
  parseAuthClaims,
  parseAuthExpiry,
  parseAuthRole,
  subscribeAuthToken,
  writeAuthToken
} from '@/utils/auth.ts'
import { HttpException } from '@/utils/http.errors.ts'

/**
 * 角色是网关管理面的门槛（服务端非 ADMIN 一律 300006），所以「解不出角色」
 * 必须等同于「不是管理员」，不能因为解析报错就把入口放开。
 *
 * 令牌本身还是界面的登录态来源（左栏账号区、设置页账号行都读它），所以写入/清除
 * 必须让订阅者收到通知 —— 登录后界面不刷新就等于没登录。
 */

function sign(payload: unknown): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.sig`
}

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
  // 解不开的令牌会 warn 一次（生产里方便定位脏令牌），测试里不该刷屏
  vi.spyOn(console, 'warn').mockImplementation(function () {})
})

describe('parseAuthRole', function () {
  it('reads the platform role out of the payload', function () {
    expect(parseAuthRole(sign({ sub: 'abc', role: 'ADMIN' }))).toBe('ADMIN')
    expect(parseAuthRole(sign({ role: 'USER' }))).toBe('USER')
  })

  it('decodes a UTF-8 payload and an unpadded base64url segment', function () {
    const token = sign({ role: 'ADMIN', username: '张伟' }).replace(/=+$/, '')
    expect(parseAuthRole(token)).toBe('ADMIN')
  })

  it('returns null for missing tokens and non-JWT strings', function () {
    expect(parseAuthRole(null)).toBeNull()
    expect(parseAuthRole(undefined)).toBeNull()
    expect(parseAuthRole('')).toBeNull()
    expect(parseAuthRole('not-a-jwt')).toBeNull()
  })

  it('returns null when the payload is not decodable JSON', function () {
    expect(parseAuthRole('header.%%%.sig')).toBeNull()
    expect(parseAuthRole(`header.${Buffer.from('hello').toString('base64url')}.sig`)).toBeNull()
  })

  it('returns null when the role claim is not a string', function () {
    expect(parseAuthRole(sign({ role: 7 }))).toBeNull()
    expect(parseAuthRole(sign({ sub: 'abc' }))).toBeNull()
  })
})

describe('isAdmin', function () {
  it('requires the exact ADMIN role and a stored token', function () {
    expect(isAdmin()).toBe(false)

    storage.set('auth-token', sign({ role: 'ADMIN' }))
    expect(findAuthRole()).toBe('ADMIN')
    expect(isAdmin()).toBe(true)

    storage.set('auth-token', sign({ role: 'admin' }))
    expect(isAdmin()).toBe(false)

    storage.set('auth-token', sign({ role: 'USER' }))
    expect(isAdmin()).toBe(false)
  })
})

describe('parseAuthClaims', function () {
  it('reads the identity claims the service signs', function () {
    const token = sign({ sub: 'u1', username: '张伟', role: 'ADMIN' })
    expect(parseAuthClaims(token)).toMatchObject({ sub: 'u1', username: '张伟', role: 'ADMIN' })
    expect(parseAuthClaims(null)).toBeNull()
    expect(parseAuthClaims('header.%%%.sig')).toBeNull()
  })

  it('rejects payloads that are not objects', function () {
    expect(parseAuthClaims(`header.${Buffer.from('123').toString('base64url')}.sig`)).toBeNull()
  })
})

describe('过期令牌', function () {
  const ONE_HOUR = 3600
  const nowSeconds = () => Math.floor(Date.now() / 1000)

  it('判得出 exp 已过，也放过还没到的', function () {
    expect(isAuthTokenExpired(sign({ exp: nowSeconds() - 60 }))).toBe(true)
    expect(isAuthTokenExpired(sign({ exp: nowSeconds() + ONE_HOUR }))).toBe(false)
  })

  it('缺 exp、脏令牌、exp 不是数字 —— 一律按「未过期」处理', function () {
    expect(isAuthTokenExpired(sign({ sub: 'u1' }))).toBe(false)
    expect(isAuthTokenExpired('not-a-jwt')).toBe(false)
    expect(isAuthTokenExpired(null)).toBe(false)
    expect(isAuthTokenExpired(sign({ exp: String(nowSeconds() + ONE_HOUR) }))).toBe(false)
  })

  it('findAuthToken 跳过过期令牌：界面该显示「未登录」，而不是挂着假登录态', function () {
    storage.set('auth-token', sign({ role: 'ADMIN', exp: nowSeconds() - 60 }))

    expect(findAuthToken()).toBeNull()
    expect(isAdmin()).toBe(false)
  })

  it('没过期的令牌照常读出，并给出毫秒级过期时刻', function () {
    const exp = nowSeconds() + ONE_HOUR
    storage.set('auth-token', sign({ role: 'ADMIN', exp }))

    expect(parseAuthExpiry(findAuthToken())).toBe(exp * 1000)
    expect(isAuthTokenExpired(findAuthToken())).toBe(false)
  })
})

describe('token storage', function () {
  it('keeps the remembered token in localStorage only', function () {
    writeAuthToken('remembered', true)
    expect(findAuthToken()).toBe('remembered')
    expect(session.has('auth-token')).toBe(false)

    writeAuthToken('session', false)
    expect(findAuthToken()).toBe('session')
    expect(storage.has('auth-token')).toBe(false)
  })

  it('clears both storages and notifies subscribers', function () {
    const listener = vi.fn()
    const unsubscribe = subscribeAuthToken(listener)

    writeAuthToken('a', true)
    expect(listener).toHaveBeenCalledTimes(1)

    clearAuthToken()
    expect(findAuthToken()).toBeNull()
    expect(storage.size).toBe(0)
    expect(session.size).toBe(0)
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    writeAuthToken('b', true)
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe('subscribeAuthToken 跨窗口', function () {
  /** 假的渲染进程 window：只留两个监听入口，用来观察跨窗口那条路是否接上 */
  function stubWindow(): Set<(event: { key: string | null }) => void> {
    const handlers = new Set<(event: { key: string | null }) => void>()
    vi.stubGlobal('window', {
      addEventListener: function (_type: string, handler: (event: { key: string | null }) => void) {
        handlers.add(handler)
      },
      removeEventListener: function (
        _type: string,
        handler: (event: { key: string | null }) => void
      ) {
        handlers.delete(handler)
      }
    })
    return handlers
  }

  afterEach(function () {
    vi.unstubAllGlobals()
  })

  /**
   * Electron 每个窗口一个渲染进程，令牌在同一份 localStorage 里，但别的窗口改了它不会
   * 通知这个窗口 —— 不接 `storage` 事件，agent 窗口的左栏就一直挂着登录前的样子。
   */
  it('别的窗口改了令牌会通知本窗口的订阅者', function () {
    const handlers = stubWindow()
    const listener = vi.fn()
    const unsubscribe = subscribeAuthToken(listener)

    storage.set('auth-token', 'from-other-window')
    for (const handler of handlers) handler({ key: 'auth-token' })

    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
  })

  it('别的键变化与没有订阅者时都不必打扰界面', function () {
    const handlers = stubWindow()
    const listener = vi.fn()
    const unsubscribe = subscribeAuthToken(listener)

    for (const handler of handlers) handler({ key: 'chat' })
    expect(listener).not.toHaveBeenCalled()

    // 没人订阅了就摘掉监听，别留着越积越多
    unsubscribe()
    expect(handlers.size).toBe(0)
  })
})

describe('clearAuthTokenIfCurrent', function () {
  it('clears the token the caller was holding', function () {
    writeAuthToken('stale', true)

    expect(clearAuthTokenIfCurrent('stale')).toBe(true)
    expect(findAuthToken()).toBeNull()
  })

  it('spares the token the user has just signed in with', function () {
    // 陈旧响应（发起时用的是 old）回来判失效时，界面已经换成了 fresh
    writeAuthToken('old', true)
    const held = findAuthToken()
    writeAuthToken('fresh', true)

    expect(clearAuthTokenIfCurrent(held)).toBe(false)
    expect(findAuthToken()).toBe('fresh')
  })

  it('reports that it did nothing when there was no token to clear', function () {
    expect(clearAuthTokenIfCurrent(null)).toBe(false)
    expect(clearAuthTokenIfCurrent('ghost')).toBe(false)
  })
})

describe('isSessionInvalid', function () {
  it('treats «not logged in», «credentials revoked» and «token expired» as a dead session', function () {
    expect(isSessionInvalid(new HttpException('用户未登录', 300001))).toBe(true)
    expect(isSessionInvalid(new HttpException('登录凭证已失效', 300002))).toBe(true)
    expect(isSessionInvalid(new HttpException('登录已过期', 300003))).toBe(true)
  })

  it('keeps the token when the failure is not about this session', function () {
    expect(isSessionInvalid(new HttpException('权限不足', 300006))).toBe(false)
    expect(isSessionInvalid(new HttpException('网络请求失败', -1))).toBe(false)
    expect(isSessionInvalid(new Error('boom'))).toBe(false)
  })
})
