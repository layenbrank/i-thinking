import { describe, expect, it } from 'vitest'

import { ReadSchema } from './store'

describe('store schemas', function () {
  it('accepts read key', function () {
    const parsed = ReadSchema.safeParse({ key: 'theme' })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty key', function () {
    const parsed = ReadSchema.safeParse({ key: '' })
    expect(parsed.success).toBe(false)
  })
})
