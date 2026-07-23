import { describe, expect, it } from 'vitest'
import { nameSchema } from './schemas'

describe('sidecar schemas', function () {
  it('accepts name payload', function () {
    const parsed = nameSchema.safeParse({ name: 'tool.exe' })
    expect(parsed.success).toBe(true)
  })
})
