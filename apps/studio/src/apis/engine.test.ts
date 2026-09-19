import { describe, expect, it } from 'vitest'

import { buildSuggestionQuery } from '@/apis/engine.ts'

describe('buildSuggestionQuery', function () {
  it('matches the overview-prefix suggestion query', function () {
    expect(buildSuggestionQuery({ qry: 'rust', cp: '4', cvid: 'ABC' })).toEqual({
      pt: 'page.home',
      qry: 'rust',
      cp: '4',
      csr: '1',
      pths: '1',
      cvid: 'ABC'
    })
  })

  it('uses the keyword length when cp is omitted', function () {
    expect(buildSuggestionQuery({ qry: 'hi', cvid: 'ABC' }).cp).toBe('2')
  })
})
