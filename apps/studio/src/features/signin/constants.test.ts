import { describe, expect, it } from 'vitest'

import { MODE, RULE, findIdentity } from '@/features/signin/constants.ts'

describe('findIdentity', function () {
  it('returns username for username mode', function () {
    expect(findIdentity(MODE.USERNAME, { username: 'alice' })).toBe('alice')
  })

  it('returns phone for phone mode', function () {
    expect(findIdentity(MODE.PHONE, { phone: '13800138000' })).toBe('13800138000')
  })

  it('returns email for email mode', function () {
    expect(findIdentity(MODE.EMAIL, { email: 'a@b.com' })).toBe('a@b.com')
  })

  it('returns empty string when value is missing', function () {
    expect(findIdentity(MODE.USERNAME, {})).toBe('')
  })
})

describe('RULE.confirm', function () {
  it('resolves when confirm matches password', async function () {
    const form = {
      getFieldValue: function (name: string) {
        if (name === 'password') return 'secret'
        return undefined
      }
    }
    const rule = RULE.confirm(form)
    await expect(rule.validator!({}, 'secret', function () {})).resolves.toBeUndefined()
  })

  it('rejects when confirm differs from password', async function () {
    const form = {
      getFieldValue: function (name: string) {
        if (name === 'password') return 'secret'
        return undefined
      }
    }
    const rule = RULE.confirm(form)
    await expect(rule.validator!({}, 'other', function () {})).rejects.toThrow(
      '两次输入的密码不一致！'
    )
  })
})
