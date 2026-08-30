import { describe, expect, it } from 'vitest'

import { findBinaryName, findPlatformKey } from './paths'

describe('sidecar paths', function () {
  it('builds platform keys', function () {
    expect(findPlatformKey('win32', 'x64')).toBe('win32-x64')
    expect(findPlatformKey('darwin', 'arm64')).toBe('darwin-arm64')
  })

  it('adds exe suffix on windows', function () {
    expect(findBinaryName('corex', 'win32')).toBe('corex.exe')
    expect(findBinaryName('corex', 'linux')).toBe('corex')
  })
})
