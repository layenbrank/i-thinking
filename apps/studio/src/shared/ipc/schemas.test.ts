import { describe, expect, it } from 'vitest'
import {
  binNameSchema,
  storeGetSchema,
  userCreateSchema
} from './schemas'

describe('ipc schemas', function () {
  it('accepts store get key', function () {
    const parsed = storeGetSchema.safeParse({ key: 'theme' })
    expect(parsed.success).toBe(true)
  })

  it('rejects empty store key', function () {
    const parsed = storeGetSchema.safeParse({ key: '' })
    expect(parsed.success).toBe(false)
  })

  it('accepts optional user email', function () {
    const parsed = userCreateSchema.safeParse({ name: 'a', email: '' })
    expect(parsed.success).toBe(true)
  })

  it('accepts bin name payload', function () {
    const parsed = binNameSchema.safeParse({ exeName: 'tool.exe' })
    expect(parsed.success).toBe(true)
  })
})
