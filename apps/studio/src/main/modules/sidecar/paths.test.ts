import { describe, expect, it } from 'vitest'

import { COREX_PIPE } from './constants'
import {
  findBinaryName,
  findDefaultIpcEndpoint,
  findPlatformKey
} from './paths'

describe('sidecar paths', function () {
  it('builds platform keys', function () {
    expect(findPlatformKey('win32', 'x64')).toBe('win32-x64')
    expect(findPlatformKey('darwin', 'arm64')).toBe('darwin-arm64')
  })

  it('adds exe suffix on windows', function () {
    expect(findBinaryName('corex', 'win32')).toBe('corex.exe')
    expect(findBinaryName('corex', 'linux')).toBe('corex')
  })

  it('uses corex default windows pipe', function () {
    expect(COREX_PIPE).toBe(String.raw`\\.\pipe\corex`)
  })

  it('matches corex ipc_endpoint on windows', function () {
    if (process.platform !== 'win32') return
    expect(findDefaultIpcEndpoint()).toBe(COREX_PIPE)
  })

  it('uses data_dir/corex.sock on unix', function () {
    if (process.platform === 'win32') return
    expect(findDefaultIpcEndpoint().endsWith('corex.sock')).toBe(true)
  })
})
