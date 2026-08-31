import { describe, expect, it } from 'vitest'
import { WriteSchema } from '@shared/ipc/user'

describe('user schemas', function () {
  it('accepts optional empty email', function () {
    const parsed = WriteSchema.safeParse({ name: 'a', email: '' })
    expect(parsed.success).toBe(true)
  })
})
