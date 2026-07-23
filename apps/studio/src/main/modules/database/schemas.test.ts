import { describe, expect, it } from 'vitest'
import { createSchema } from './schemas'

describe('database schemas', function () {
  it('accepts optional empty email', function () {
    const parsed = createSchema.safeParse({ name: 'a', email: '' })
    expect(parsed.success).toBe(true)
  })
})
