import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { findBinary, findBinaryName, findPlatformKey } from './binaries'

/**
 * 取用顺序是这一层的全部价值，所以钉的就是顺序本身：**显式指定 → 目录顺序 → 名字顺序**。
 * 断言语义（「哪个来源赢了」），不断言实现（不关心内部怎么拼路径）。
 */

const TMP_ROOT = mkdtempSync(path.join(os.tmpdir(), 'ith-binaries-'))

const NAMES = ['ffmpeg', 'ffprobe']

/** 造一个目录，里面放上指定的二进制（按当前平台补后缀） */
function buildDir(entry: string, names: readonly string[]): string {
  const dir = path.join(TMP_ROOT, entry)
  mkdirSync(dir, { recursive: true })
  for (const name of names) {
    writeFileSync(path.join(dir, findBinaryName(name)), `${entry}:${name}`)
  }
  return dir
}

beforeAll(function () {
  expect(existsSync(TMP_ROOT)).toBe(true)
})

afterAll(function () {
  rmSync(TMP_ROOT, { recursive: true, force: true })
})

describe('findBinary', function () {
  it('takes the first directory that has anything', function () {
    const downloaded = buildDir('downloaded', ['ffprobe'])
    const bundled = buildDir('bundled', NAMES)

    // 目录优先于名字：前面那份哪怕只有附属二进制，也不与后面的来源混用
    expect(findBinary({ dirs: [downloaded, bundled], names: NAMES })?.path).toBe(
      path.join(downloaded, findBinaryName('ffprobe'))
    )
  })

  it('falls through to the next directory when the first is empty', function () {
    const empty = buildDir('empty', [])
    const bundled = buildDir('bundled', NAMES)

    expect(findBinary({ dirs: [empty, bundled], names: NAMES })?.path).toBe(
      path.join(bundled, findBinaryName('ffmpeg'))
    )
  })

  it('lets an explicit path win, and warns when it is missing', function () {
    const bundled = buildDir('bundled', NAMES)
    const explicit = path.join(buildDir('explicit', ['ffmpeg']), findBinaryName('ffmpeg'))

    expect(findBinary({ explicit, dirs: [bundled], names: NAMES })?.path).toBe(explicit)

    const warn = vi.spyOn(console, 'warn').mockImplementation(function () {})
    const missing = path.join(TMP_ROOT, 'gone', findBinaryName('ffmpeg'))
    expect(findBinary({ explicit: missing, dirs: [bundled], names: NAMES })?.path).toBe(
      path.join(bundled, findBinaryName('ffmpeg'))
    )
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it('returns null instead of a path that is not there', function () {
    const empty = buildDir('empty', [])

    expect(findBinary({ dirs: [empty], names: NAMES })).toBeNull()
    expect(findBinary({ dirs: [], names: NAMES })).toBeNull()
  })
})

describe('platform facts', function () {
  it('builds the platform key the same way for every caller', function () {
    expect(findPlatformKey('win32', 'x64')).toBe('win32-x64')
    expect(findPlatformKey('darwin', 'arm64')).toBe('darwin-arm64')
  })

  it('appends the executable suffix only on windows', function () {
    expect(findBinaryName('corex', 'win32')).toBe('corex.exe')
    expect(findBinaryName('corex', 'linux')).toBe('corex')
  })
})
