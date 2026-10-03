import { describe, expect, it } from 'vitest'

import { parseShotPath, readPngSize } from './capture-parse'

describe('parseShotPath', function () {
  it('accepts a bare path string', function () {
    expect(parseShotPath('/tmp/a.png')).toBe('/tmp/a.png')
  })

  it('reads variables.screenshot', function () {
    expect(
      parseShotPath({
        variables: { screenshot: 'D:/shots/a.png' }
      })
    ).toBe('D:/shots/a.png')
  })

  it('reads nested path object', function () {
    expect(
      parseShotPath({
        screenshot: { path: 'C:/out.png' }
      })
    ).toBe('C:/out.png')
  })

  it('returns null when missing', function () {
    expect(parseShotPath(null)).toBeNull()
    expect(parseShotPath({})).toBeNull()
  })
})

describe('readPngSize', function () {
  it('returns zeros for missing files', function () {
    expect(readPngSize('Z:/no-such-file.png')).toEqual({ width: 0, height: 0 })
  })
})
