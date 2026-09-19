import { describe, expect, it } from 'vitest'

import { parseSuggestion } from '@/views/overview/engine/suggestion'

describe('parseSuggestion', function () {
  it('keeps items that have id, q and u', function () {
    expect(
      parseSuggestion({
        s: [{ id: 'sa_1', q: 'hello', u: '/search?q=hello', t: 'MT' }]
      })
    ).toEqual([{ id: 'sa_1', q: 'hello', u: '/search?q=hello', t: 'MT' }])
  })
})
