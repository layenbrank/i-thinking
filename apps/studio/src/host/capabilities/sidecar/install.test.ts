import { describe, expect, it } from 'vitest'

import path from 'node:path'
import os from 'node:os'

import {
  BUNDLED_ENDPOINT,
  COREX_DATA_DIR_ENV,
  DATABASE_FILE,
  findBinaryName,
  findBundledInstall,
  findCandidateDirs,
  findCorexInstall,
  findPlatformKey,
  parsePaths
} from './install'

const PATHS_JSON = JSON.stringify({
  version: '13.0.0',
  data_dir: String.raw`C:\Users\x\.corex`,
  database: String.raw`C:\Users\x\.corex\corex.db`,
  endpoint: String.raw`\\.\pipe\corex`,
  token_file: String.raw`C:\Users\x\.corex\token`
})

describe('parsePaths', function () {
  it('reads the paths corex reports', function () {
    expect(parsePaths(PATHS_JSON)).toEqual({
      version: '13.0.0',
      data_dir: String.raw`C:\Users\x\.corex`,
      database: String.raw`C:\Users\x\.corex\corex.db`,
      endpoint: String.raw`\\.\pipe\corex`,
      token_file: String.raw`C:\Users\x\.corex\token`
    })
  })

  // 旧版 corex 还不认识指令库，界面至少要显示出一个说得通的路径
  it('derives database when corex leaves it out', function () {
    const text = JSON.stringify({ data_dir: 'D:\\corex', endpoint: 'corex.sock' })
    expect(parsePaths(text)?.database).toBe(path.join('D:\\corex', 'corex.db'))
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

  it('lists user install locations and never the data directory', function () {
    const original = process.env.PATH
    process.env.PATH = [String.raw`C:\tools\corex`, String.raw`C:\Windows`].join(path.delimiter)
    try {
      const dirs = findCandidateDirs()
      expect(dirs[0]).toBe(String.raw`C:\tools\corex`)
      // 数据目录只放数据（指令库、token、历史），不是二进制的来源
      expect(dirs).not.toContain(path.join(os.homedir(), '.corex'))
      if (process.platform === 'win32') {
        const local = process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local')
        expect(dirs).toContain(path.join(local, 'corex', 'bin'))
      }
    } finally {
      process.env.PATH = original
    }
  })

  it('de-duplicates the candidates', function () {
    const original = process.env.PATH
    process.env.PATH = [
      String.raw`C:\tools\corex`,
      String.raw`C:\Windows`,
      String.raw`C:\tools\corex`
    ].join(path.delimiter)
    try {
      const dirs = findCandidateDirs()
      expect(
        dirs.filter(function (dir) {
          return path.resolve(dir) === path.resolve(String.raw`C:\tools\corex`)
        })
      ).toHaveLength(1)
    } finally {
      process.env.PATH = original
    }
  })
})

describe('bundled install', function () {
  it('keeps its data dir off the sidecar dir', function () {
    const install = findBundledInstall()
    expect(install.isBundled).toBe(true)
    // staging 在仓库里、resources/sidecar 在应用目录里：数据目录绝不许落在这些地方
    expect(install.dataDir).not.toContain('sidecar')
    expect(install.database).toBe(path.join(install.dataDir, DATABASE_FILE))
    expect(install.tokenFile).toBe(path.join(install.dataDir, 'token'))
    if (process.platform === 'win32') {
      expect(install.endpoint).toBe(BUNDLED_ENDPOINT)
    }
  })

  it('lets COREX_DATA_DIR point the bundled copy at real data', function () {
    const original = process.env[COREX_DATA_DIR_ENV]
    process.env[COREX_DATA_DIR_ENV] = String.raw`C:\Users\x\.corex`
    try {
      const install = findBundledInstall()
      expect(install.dataDir).toBe(String.raw`C:\Users\x\.corex`)
      expect(install.database).toBe(path.join(install.dataDir, DATABASE_FILE))
    } finally {
      if (original === undefined) delete process.env[COREX_DATA_DIR_ENV]
      else process.env[COREX_DATA_DIR_ENV] = original
    }
  })
})

describe('findCorexInstall', function () {
  it('always returns an install shape', async function () {
    const install = await findCorexInstall()
    expect(install.cli).not.toBe('')
    expect(install.daemon).not.toBe('')
    expect(install.dataDir).not.toBe('')
    expect(install.database).not.toBe('')
    expect(install.endpoint).not.toBe('')
  })
})
