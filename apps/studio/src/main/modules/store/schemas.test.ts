import { describe, expect, it } from 'vitest'
import { getSchema } from './schemas'

describe('store schemas', function () {
  it('accepts get key', function () {
    const parsed = getSchema.safeParse({ key: 'theme' })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty key', function () {
    const parsed = getSchema.safeParse({ key: '' })
    expect(parsed.success).toBe(false)
  })
})
