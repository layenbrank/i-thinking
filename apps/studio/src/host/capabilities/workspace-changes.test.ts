import { describe, expect, it } from 'vitest'

import { countLineDiff } from '@/host/capabilities/workspace-changes.ts'

describe('countLineDiff', function () {
  it('counts pure additions', function () {
    expect(countLineDiff('', 'a\nb')).toEqual({ added: 2, removed: 0 })
  })

  it('counts pure removals', function () {
    expect(countLineDiff('a\nb\nc', 'a')).toEqual({ added: 0, removed: 2 })
  })

  it('counts mixed changes', function () {
    expect(countLineDiff('a\nb\nc', 'a\nx\nc')).toEqual({ added: 1, removed: 1 })
  })

  it('treats identical content as zero', function () {
    expect(countLineDiff('a\nb', 'a\nb')).toEqual({ added: 0, removed: 0 })
  })
})
