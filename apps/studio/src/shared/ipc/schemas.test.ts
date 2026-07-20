import { describe, expect, it } from 'vitest'
import {
  sidecarNameSchema,
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

  it('accepts sidecar name payload', function () {
    const parsed = sidecarNameSchema.safeParse({ name: 'tool.exe' })
    expect(parsed.success).toBe(true)
  })
})
