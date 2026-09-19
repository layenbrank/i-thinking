import { describe, expect, it } from 'vitest'

import { parseEngineKey } from '@/views/overview/engine/store'

describe('parseEngineKey', function () {
  it('keeps a known engine key', function () {
    expect(parseEngineKey({ key: 'baidu' })).toBe('baidu')
  })

  it('falls back when the stored value is missing or unknown', function () {
    expect(parseEngineKey(null)).toBe('bing')
    expect(parseEngineKey({ key: 'yahoo' })).toBe('bing')
  })
})
