import { describe, expect, it } from 'vitest'

import { ALLOWED_SIDECARS, isAllowedSidecarName } from './allowlist'

describe('sidecar allowlist', function () {
  it('rejects path traversal', function () {
    expect(isAllowedSidecarName('../evil.exe')).toBe(false)
    expect(isAllowedSidecarName('foo/bar')).toBe(false)
    expect(isAllowedSidecarName('foo\\bar')).toBe(false)
  })

  it('rejects names not in allowlist', function () {
    expect(isAllowedSidecarName('not-listed.exe')).toBe(false)
  })

  it('accepts windows and unix allowlisted names', function () {
    expect(isAllowedSidecarName('corex.exe')).toBe(true)
    expect(isAllowedSidecarName('corex')).toBe(true)
    expect(isAllowedSidecarName('generate')).toBe(true)
  })

  it('accepts allowlisted names only', function () {
    const sample = 'fixture-sidecar.exe'
    ALLOWED_SIDECARS.add(sample)
    try {
      expect(isAllowedSidecarName(sample)).toBe(true)
    } finally {
      ALLOWED_SIDECARS.delete(sample)
    }
  })
})
