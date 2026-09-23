import { describe, expect, it } from 'vitest'

import path from 'node:path'
import os from 'node:os'

import {
  COREX_CLI_ENV,
  findBinaryName,
  findCandidateDirs,
  findCorexInstall,
  findPlatformKey,
  parsePaths
} from './install'

const PATHS_JSON = JSON.stringify({
  version: '12.0.0',
  data_dir: String.raw`C:\Users\x\.corex`,
  directives_dir: String.raw`C:\Users\x\.corex\directives`,
  endpoint: String.raw`\\.\pipe\corex`,
  token_file: String.raw`C:\Users\x\.corex\token`
})

describe('parsePaths', function () {
  it('reads the paths corex reports', function () {
    expect(parsePaths(PATHS_JSON)).toEqual({
      version: '12.0.0',
      data_dir: String.raw`C:\Users\x\.corex`,
      directives_dir: String.raw`C:\Users\x\.corex\directives`,
      endpoint: String.raw`\\.\pipe\corex`,
      token_file: String.raw`C:\Users\x\.corex\token`
    })
  })

  it('derives directives_dir when corex leaves it out', function () {
    const text = JSON.stringify({ data_dir: 'D:\\corex', endpoint: 'corex.sock' })
    expect(parsePaths(text)?.directives_dir).toBe(path.join('D:\\corex', 'directives'))
  })

  it('keeps token_file null when the token is not file-borne', function () {
    const text = JSON.stringify({ data_dir: 'D:\\corex', endpoint: 'corex.sock', token_file: null })
    expect(parsePaths(text)?.token_file).toBeNull()
  })

  it('rejects output that is not JSON', function () {
    expect(parsePaths('corex paths')).toBeNull()
  })

  it('rejects output we could not connect with', function () {
    expect(parsePaths(JSON.stringify({ version: '12.0.0' }))).toBeNull()
  })
})

describe('discovery paths', function () {
  it('builds platform keys', function () {
    expect(findPlatformKey('win32', 'x64')).toBe('win32-x64')
    expect(findPlatformKey('darwin', 'arm64')).toBe('darwin-arm64')
  })

  it('adds exe suffix on windows', function () {
    expect(findBinaryName('corex', 'win32')).toBe('corex.exe')
    expect(findBinaryName('corex', 'linux')).toBe('corex')
  })

  it('puts the explicit dir first and de-duplicates', function () {
    const original = process.env[COREX_CLI_ENV]
    process.env[COREX_CLI_ENV] = String.raw`C:\tools\corex\corex.exe`
    process.env.PATH = [String.raw`C:\tools\corex`, String.raw`C:\Windows`].join(path.delimiter)
    try {
      const dirs = findCandidateDirs()
      expect(dirs[0]).toBe(String.raw`C:\tools\corex`)
      expect(
        dirs.filter(function (dir) {
          return path.resolve(dir) === path.resolve(String.raw`C:\tools\corex`)
        })
      ).toHaveLength(1)
      expect(dirs).toContain(path.join(os.homedir(), '.corex'))
    } finally {
      process.env[COREX_CLI_ENV] = original
    }
  })
})

describe('findCorexInstall', function () {
  it('always resolves to a usable install, user-installed or bundled', async function () {
    const install = await findCorexInstall()
    expect(install.dataDir).not.toBe('')
    expect(install.endpoint).not.toBe('')
    expect(install.daemon.endsWith(findBinaryName('corex-daemon'))).toBe(true)
  })
})
