import { describe, expect, it } from 'vitest'

import { countToolFailures, type ToolPartLike } from './tool-stats'

/**
 * 折叠条只拿到 indices，成败在消息部件上 —— 边界（越界、非工具部件、审批中）都要有确定答案。
 */

function toolPart(status: string, isError?: boolean): ToolPartLike {
  return {
    type: 'tool-call',
    ...(isError === undefined ? {} : { isError }),
    status: { type: status }
  }
}

describe('countToolFailures', function () {
  it('counts nothing when every call completed', function () {
    const parts = [toolPart('complete'), toolPart('complete')]

    expect(countToolFailures(parts, [0, 1])).toBe(0)
  })

  it('counts incomplete statuses', function () {
    const parts = [toolPart('complete'), toolPart('incomplete')]

    expect(countToolFailures(parts, [0, 1])).toBe(1)
  })

  it('counts the isError flag even if the status looks fine', function () {
    const parts = [toolPart('complete', true)]

    expect(countToolFailures(parts, [0])).toBe(1)
  })

  it('does not count a call that is waiting for approval', function () {
    const parts = [toolPart('requires-action')]

    expect(countToolFailures(parts, [0])).toBe(0)
  })

  it('does not count running calls', function () {
    const parts = [toolPart('running')]

    expect(countToolFailures(parts, [0])).toBe(0)
  })

  it('ignores out-of-range indices and non-tool parts', function () {
    const parts: ToolPartLike[] = [{ type: 'text' }]

    expect(countToolFailures(parts, [0, 5, -1])).toBe(0)
  })
})
