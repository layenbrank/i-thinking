import { describe, expect, it } from 'vitest'
import { ALLOWED_BINS, isAllowedBinName } from './allowlist'

describe('bin allowlist', function () {
  it('rejects path traversal', function () {
    expect(isAllowedBinName('../evil.exe')).toBe(false)
    expect(isAllowedBinName('foo/bar')).toBe(false)
    expect(isAllowedBinName('foo\\bar')).toBe(false)
  })

  it('rejects names not in allowlist', function () {
    expect(isAllowedBinName('not-listed.exe')).toBe(false)
  })

  it('accepts allowlisted names only', function () {
    const sample = 'fixture-bin.exe'
    ALLOWED_BINS.add(sample)
    try {
      expect(isAllowedBinName(sample)).toBe(true)
    } finally {
      ALLOWED_BINS.delete(sample)
    }
  })
})
