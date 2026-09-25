import { describe, expect, it } from 'vitest'

import type { AuthProfile } from '@/apis/auth.ts'
import { findAccountIdentity, findInitials, findRoleLabel } from '@/features/account/identity.ts'

/**
 * 身份展示只有一处来源（`findAccountIdentity`），左栏、账号菜单、设置页都读它 ——
 * 所以「资料缺失时能不能退回令牌」「两者都没有时算不算未登录」必须在这里定死，
 * 免得三个地方各判一次、结论还不一样。
 */

function buildProfile(patch: Partial<AuthProfile>): AuthProfile {
  return {
    id: 'u1',
    username: 'zhangwei',
    role: 'USER',
    status: 'ACTIVE',
    email: null,
    phone: null,
    gender: null,
    birthday: null,
    age: null,
    avatar: null,
    createdAt: 0,
    updatedAt: 0,
    ...patch
  }
}

describe('findRoleLabel', function () {
  it('maps the platform roles the service issues', function () {
    expect(findRoleLabel('ADMIN')).toBe('管理员')
    expect(findRoleLabel('USER')).toBe('用户')
  })

  it('keeps unknown roles readable instead of hiding them', function () {
    expect(findRoleLabel('AUDITOR')).toBe('AUDITOR')
    expect(findRoleLabel(null)).toBe('未知角色')
  })
})

describe('findInitials', function () {
  it('takes the first code point', function () {
    expect(findInitials('张伟')).toBe('张')
    expect(findInitials('zhangwei')).toBe('Z')
    expect(findInitials('  ada  ')).toBe('A')
    expect(findInitials('🚀 rocket')).toBe('🚀')
    expect(findInitials('')).toBe('?')
  })
})

describe('findAccountIdentity', function () {
  it('prefers the profile and keeps the email as the detail line', function () {
    const identity = findAccountIdentity(
      buildProfile({ username: '张伟', email: 'z@example.com', role: 'ADMIN' }),
      { username: 'stale', role: 'USER' }
    )

    expect(identity).toMatchObject({
      name: '张伟',
      initials: '张',
      detail: 'z@example.com',
      roleLabel: '管理员',
      source: 'profile'
    })
  })

  it('falls back to the phone when there is no email', function () {
    const identity = findAccountIdentity(buildProfile({ phone: '13800000000' }), null)
    expect(identity?.detail).toBe('13800000000')
  })

  it('falls back to the token while the profile is unreachable', function () {
    const identity = findAccountIdentity(null, { username: 'zhangwei', role: 'ADMIN' })
    expect(identity).toMatchObject({
      name: 'zhangwei',
      initials: 'Z',
      detail: null,
      roleLabel: '管理员',
      source: 'token'
    })
  })

  it('reports «no identity» when neither source has a username', function () {
    expect(findAccountIdentity(null, null)).toBeNull()
    expect(findAccountIdentity(buildProfile({ username: '   ' }), { username: '' })).toBeNull()
  })
})
